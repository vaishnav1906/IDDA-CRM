import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { resolveInput } from 'twenty-shared/utils';
import { MoreThanOrEqual } from 'typeorm';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowCheckFirstContactSlaAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-first-contact-sla/guards/is-workflow-check-first-contact-sla-action.guard';
import { type WorkflowCheckFirstContactSlaActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-first-contact-sla/types/workflow-check-first-contact-sla-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

// Statuses that count as "first contact made" — any of these means the SLA is satisfied.
const CONTACTED_STATUSES = new Set([
  'CONTACTED',
  'INTERESTED',
  'CONVERTED',
  'REJECTED',
  'DUPLICATE',
]);

type FirstContactSlaResult =
  | 'LEAD_NOT_FOUND'
  | 'ALREADY_CONTACTED'
  | 'ALREADY_WARNED_TODAY'
  | 'SLA_BREACH_NOTIFIED';

@Injectable()
export class CheckFirstContactSlaWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(
    CheckFirstContactSlaWorkflowAction.name,
  );

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

    if (!isWorkflowCheckFirstContactSlaAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a check-first-contact-sla action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowCheckFirstContactSlaActionInput;

    if (!isDefined(input.leadId)) {
      throw new WorkflowStepExecutorException(
        'leadId is required for check-first-contact-sla action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const { workspaceId } = runInfo;
    const authContext = buildSystemAuthContext(workspaceId);

    let result: FirstContactSlaResult = 'ALREADY_CONTACTED';
    let breached = false;

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
          result = 'LEAD_NOT_FOUND';
          return;
        }

        // SLA satisfied — lead has been contacted or otherwise progressed.
        if (isDefined(lead.status) && CONTACTED_STATUSES.has(lead.status)) {
          result = 'ALREADY_CONTACTED';
          return;
        }

        // Deduplication: skip if we already fired a breach warning today.
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const timelineRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'timelineActivity',
            { shouldBypassPermissionChecks: true },
          );

        const recentBreach = await timelineRepo.findOne({
          where: {
            targetLeadId: input.leadId,
            name: 'workflow.lead.first_contact_sla_breach',
            happensAt: MoreThanOrEqual(todayStart),
          },
        });

        if (isDefined(recentBreach)) {
          result = 'ALREADY_WARNED_TODAY';
          return;
        }

        breached = true;
        result = 'SLA_BREACH_NOTIFIED';
      },
      authContext,
    );

    if (breached) {
      if (isDefined(input.assignedToId)) {
        await this.notificationDispatchService.dispatchInApp({
          workspaceId,
          recipientWorkspaceMemberId: input.assignedToId,
          title: 'First Contact SLA breached',
          body: 'This lead was assigned over 1 business day ago and has not been contacted yet. Please reach out now.',
          notificationType: 'SLA_BREACH',
          relatedRecordId: input.leadId,
          actionUrl: `/leads/${input.leadId}`,
        });
      }

      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'lead',
        targetRecordId: input.leadId,
        eventName: 'workflow.lead.first_contact_sla_breach',
        properties: {
          message:
            'Lead remained in ASSIGNED status for more than 1 business day without first contact.',
        },
      });
    }

    this.logger.log(
      `First contact SLA check for ${input.leadId} in workspace ${workspaceId}: ` +
        `result=${result}`,
    );

    return {
      result: {
        breached,
        outcome: result,
      },
    };
  }
}
