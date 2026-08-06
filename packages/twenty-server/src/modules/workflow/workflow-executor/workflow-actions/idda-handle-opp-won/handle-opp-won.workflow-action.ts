import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { resolveInput } from 'twenty-shared/utils';
import { FieldActorSource } from 'twenty-shared/types';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowHandleOppWonAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/guards/is-workflow-handle-opp-won-action.guard';
import { type WorkflowHandleOppWonActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/types/workflow-handle-opp-won-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { type SubscriptionWorkspaceEntity } from 'src/modules/subscription/standard-objects/subscription.workspace-entity';

const ONBOARDING_TASKS = [
  { title: 'Welcome call', daysFromNow: 1 },
  { title: 'Send agreement and documents', daysFromNow: 2 },
  { title: 'Confirm service activation or delivery', daysFromNow: 5 },
  { title: '14-day check-in', daysFromNow: 14 },
  { title: '30-day satisfaction check', daysFromNow: 30 },
] as const;

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);

  return d;
};

type HandoffResult =
  | { outcome: 'SUBSCRIPTION_ALREADY_EXISTS'; subscriptionId: string }
  | { outcome: 'OPP_NOT_FOUND' }
  | {
      outcome: 'SUBSCRIPTION_CREATED';
      subscriptionId: string;
      tasksCreated: number;
    };

@Injectable()
export class HandleOppWonWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(HandleOppWonWorkflowAction.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
  ) {}

  async execute({
    currentStepId,
    steps,
    context,
    runInfo,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({ stepId: currentStepId, steps });

    if (!isWorkflowHandleOppWonAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a handle-opp-won action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowHandleOppWonActionInput;

    if (!isDefined(input.opportunityId)) {
      throw new WorkflowStepExecutorException(
        'opportunityId is required for handle-opp-won action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const { workspaceId } = runInfo;
    const authContext = buildSystemAuthContext(workspaceId);

    // Wrapper prevents tsgo from narrowing the type through async-callback mutations
    const handoffState = { result: { outcome: 'OPP_NOT_FOUND' } as HandoffResult };
    let salesExecId: string | null = null;
    let oppName: string | null = null;

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const oppRepo =
          await this.globalWorkspaceOrmManager.getRepository<OpportunityWorkspaceEntity>(
            workspaceId,
            'opportunity',
            { shouldBypassPermissionChecks: true },
          );

        const opp = await oppRepo.findOne({
          where: { id: input.opportunityId },
        });

        if (!isDefined(opp)) {
          handoffState.result = { outcome: 'OPP_NOT_FOUND' };

          return;
        }

        salesExecId = opp.ownerId ?? null;
        oppName = opp.name ?? null;

        // Idempotency: check if a Subscription already exists for this Opportunity.
        const subscriptionRepo =
          await this.globalWorkspaceOrmManager.getRepository<SubscriptionWorkspaceEntity>(
            workspaceId,
            'subscription',
            { shouldBypassPermissionChecks: true },
          );

        const existingSub = await subscriptionRepo.findOne({
          where: { opportunityId: input.opportunityId },
        });

        if (isDefined(existingSub)) {
          handoffState.result = {
            outcome: 'SUBSCRIPTION_ALREADY_EXISTS',
            subscriptionId: existingSub.id,
          };
          this.logger.log(
            `Opportunity ${input.opportunityId}: Subscription ${existingSub.id} already exists — skipping creation`,
          );

          return;
        }

        // Determine Operations owner (fallback to Sales Executive).
        const operationsOwnerId =
          input.operationsOwnerId ?? opp.ownerId ?? null;

        // Create Subscription.
        const now = new Date();
        const subData = {
          name: `${opp.name ?? 'Subscription'} — Onboarding`,
          status: 'PENDING_ONBOARDING',
          startDate: now,
          opportunityId: input.opportunityId,
          clinicId: opp.companyId ?? undefined,
          doctorId: opp.pointOfContactId ?? undefined,
          assignedEmployeeId: operationsOwnerId ?? undefined,
          createdBySource: FieldActorSource.SYSTEM,
          createdByName: 'IDDA CRM',
          createdByWorkspaceMemberId: null,
          updatedBySource: FieldActorSource.SYSTEM,
          updatedByName: 'IDDA CRM',
          updatedByWorkspaceMemberId: null,
        };

        const saveResult = await subscriptionRepo.save(
          subData as unknown as SubscriptionWorkspaceEntity,
        );
        const savedSub = Array.isArray(saveResult) ? saveResult[0] : saveResult;
        const subscriptionId = savedSub.id;

        // Create 5 onboarding tasks linked to the Opportunity.
        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );
        const taskTargetRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'taskTarget',
          { shouldBypassPermissionChecks: true },
        );

        let tasksCreated = 0;

        for (const taskDef of ONBOARDING_TASKS) {
          const taskData = {
            title: taskDef.title,
            status: 'TODO',
            dueAt: addDays(now, taskDef.daysFromNow),
            assigneeId: operationsOwnerId ?? undefined,
            createdBySource: FieldActorSource.SYSTEM,
            createdByName: 'IDDA CRM',
            createdByWorkspaceMemberId: null,
            updatedBySource: FieldActorSource.SYSTEM,
            updatedByName: 'IDDA CRM',
            updatedByWorkspaceMemberId: null,
          };

          const taskSaveResult = await taskRepo.save(taskData as any);
          const savedTask = Array.isArray(taskSaveResult)
            ? taskSaveResult[0]
            : taskSaveResult;

          // Link task to Opportunity via taskTarget.
          await taskTargetRepo.save({
            taskId: savedTask.id,
            targetOpportunityId: input.opportunityId,
          } as any);

          tasksCreated++;
        }

        handoffState.result = {
          outcome: 'SUBSCRIPTION_CREATED',
          subscriptionId,
          tasksCreated,
        };

        this.logger.log(
          `Opportunity ${input.opportunityId}: Subscription ${subscriptionId} created ` +
            `with ${tasksCreated} onboarding tasks`,
        );
      },
      authContext,
    );

    // Timeline events and notifications — only after successful DB operations.
    const finalResult: HandoffResult = handoffState.result;

    if (finalResult.outcome === 'SUBSCRIPTION_CREATED') {
      const { subscriptionId, tasksCreated } = finalResult;

      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'opportunity',
        targetRecordId: input.opportunityId,
        eventName: 'workflow.opportunity.won.subscription_created',
        properties: {
          subscriptionId,
          tasksCreated,
          oppName,
        },
      });

      // Notify the Sales Executive.
      if (isDefined(salesExecId)) {
        await this.notificationDispatchService.dispatchInApp({
          workspaceId,
          recipientWorkspaceMemberId: salesExecId,
          title: `Opportunity won: ${oppName ?? 'Deal'}`,
          body: `A subscription has been created and ${tasksCreated} onboarding tasks are assigned. The operations team has been notified.`,
          notificationType: 'OPP_WON_HANDOFF',
          relatedRecordId: input.opportunityId,
          actionUrl: `/opportunities/${input.opportunityId}`,
        });
      }

      // Notify the Operations owner (if different from Sales Executive).
      const operationsOwnerId = input.operationsOwnerId;

      if (
        isDefined(operationsOwnerId) &&
        operationsOwnerId !== salesExecId
      ) {
        await this.notificationDispatchService.dispatchInApp({
          workspaceId,
          recipientWorkspaceMemberId: operationsOwnerId,
          title: `New onboarding: ${oppName ?? 'Deal'}`,
          body: `A deal has been won and you have been assigned ${tasksCreated} onboarding tasks. Please begin the welcome sequence.`,
          notificationType: 'OPP_WON_HANDOFF',
          relatedRecordId: subscriptionId,
          actionUrl: `/subscriptions/${subscriptionId}`,
        });
      }
    } else if (finalResult.outcome === 'SUBSCRIPTION_ALREADY_EXISTS') {
      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'opportunity',
        targetRecordId: input.opportunityId,
        eventName: 'workflow.opportunity.won.subscription_exists',
        properties: {
          subscriptionId: finalResult.subscriptionId,
          message: 'Subscription already exists — skipped creation (idempotent)',
        },
      });
    }

    this.logger.log(
      `Opp-won handoff for ${input.opportunityId} in workspace ${workspaceId}: outcome=${finalResult.outcome}`,
    );

    return {
      result: finalResult,
    };
  }
}
