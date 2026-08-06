import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { resolveInput } from 'twenty-shared/utils';
import { In, MoreThanOrEqual, Not } from 'typeorm';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowCheckLeadNextStepAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-lead-next-step/guards/is-workflow-check-lead-next-step-action.guard';
import { type WorkflowCheckLeadNextStepActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-lead-next-step/types/workflow-check-lead-next-step-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

type NextStepCheckReason =
  | 'FOLLOW_UP_DATE_SET'
  | 'OPEN_TASK_EXISTS'
  | 'ALREADY_WARNED_TODAY'
  | 'NO_NEXT_STEP'
  | 'LEAD_NOT_FOUND';

@Injectable()
export class CheckLeadNextStepWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(CheckLeadNextStepWorkflowAction.name);

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

    if (!isWorkflowCheckLeadNextStepAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a check-lead-next-step action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowCheckLeadNextStepActionInput;

    if (!isDefined(input.leadId)) {
      throw new WorkflowStepExecutorException(
        'leadId is required for check-lead-next-step action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const { workspaceId } = runInfo;
    const authContext = buildSystemAuthContext(workspaceId);

    let warningIssued = false;
    let reason: NextStepCheckReason = 'FOLLOW_UP_DATE_SET';

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const leadRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'lead',
            { shouldBypassPermissionChecks: true },
          );

        const lead = await leadRepo.findOne({
          where: { id: input.leadId },
        });

        if (!isDefined(lead)) {
          reason = 'LEAD_NOT_FOUND';
          return;
        }

        if (isDefined(lead.nextFollowUpDate)) {
          reason = 'FOLLOW_UP_DATE_SET';
          return;
        }

        const taskTargetRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'taskTarget',
            { shouldBypassPermissionChecks: true },
          );

        const taskTargets = await taskTargetRepo.find({
          where: { targetLeadId: input.leadId },
        });

        let hasOpenTask = false;

        if (taskTargets.length > 0) {
          const taskIds = taskTargets
            .map((tt) => tt.taskId)
            .filter(isDefined);

          if (taskIds.length > 0) {
            const taskRepo =
              await this.globalWorkspaceOrmManager.getRepository(
                workspaceId,
                'task',
                { shouldBypassPermissionChecks: true },
              );

            const openTaskCount = await taskRepo.count({
              where: { id: In(taskIds), status: Not('DONE') },
            });

            hasOpenTask = openTaskCount > 0;
          }
        }

        if (hasOpenTask) {
          reason = 'OPEN_TASK_EXISTS';
          return;
        }

        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const timelineRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'timelineActivity',
            { shouldBypassPermissionChecks: true },
          );

        const recentWarning = await timelineRepo.findOne({
          where: {
            targetLeadId: input.leadId,
            name: 'workflow.lead.next_step_missing',
            happensAt: MoreThanOrEqual(todayStart),
          },
        });

        if (isDefined(recentWarning)) {
          reason = 'ALREADY_WARNED_TODAY';
          return;
        }

        warningIssued = true;
        reason = 'NO_NEXT_STEP';
      },
      authContext,
    );

    if (warningIssued) {
      if (isDefined(input.assignedToId)) {
        await this.notificationDispatchService.dispatchInApp({
          workspaceId,
          recipientWorkspaceMemberId: input.assignedToId,
          title: 'Lead needs a next step',
          body: 'This lead has no follow-up date or open task. Please schedule the next action.',
          notificationType: 'NEXT_STEP_MISSING',
          relatedRecordId: input.leadId,
          actionUrl: `/leads/${input.leadId}`,
        });
      }

      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'lead',
        targetRecordId: input.leadId,
        eventName: 'workflow.lead.next_step_missing',
        properties: {
          message:
            'Lead moved to active stage without a follow-up date or open task.',
        },
      });
    }

    this.logger.log(
      `Lead next-step check for ${input.leadId} in workspace ${workspaceId}: ` +
        `warningIssued=${warningIssued}, reason=${reason}`,
    );

    return {
      result: {
        warningIssued,
        reason,
      },
    };
  }
}
