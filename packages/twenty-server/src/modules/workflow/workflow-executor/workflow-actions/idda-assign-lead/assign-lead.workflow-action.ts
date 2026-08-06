import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { resolveInput } from 'twenty-shared/utils';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowAssignLeadAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/guards/is-workflow-assign-lead-action.guard';
import { type WorkflowAssignLeadActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/types/workflow-assign-lead-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

@Injectable()
export class AssignLeadWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(AssignLeadWorkflowAction.name);

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

    if (!isWorkflowAssignLeadAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not an assign-lead action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowAssignLeadActionInput;

    if (!isDefined(input.leadId)) {
      throw new WorkflowStepExecutorException(
        'leadId is required for assign-lead action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    if (!isDefined(input.assigneeWorkspaceMemberId)) {
      throw new WorkflowStepExecutorException(
        'assigneeWorkspaceMemberId is required for assign-lead action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const { workspaceId } = runInfo;
    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const leadRepository = await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        'lead',
        { shouldBypassPermissionChecks: true },
      );

      await leadRepository.update(
        { id: input.leadId },
        { assigneeId: input.assigneeWorkspaceMemberId },
      );
    }, authContext);

    await this.workflowTimelineWriterService.write({
      workspaceId,
      targetObjectSingularName: 'lead',
      targetRecordId: input.leadId,
      eventName: 'workflow.lead.assigned',
      properties: {
        assignedTo: input.assigneeWorkspaceMemberId,
      },
    });

    const shouldNotify =
      input.notifyAssignee ?? step.settings.notifyAssignee ?? false;

    if (shouldNotify) {
      await this.notificationDispatchService.dispatchInApp({
        workspaceId,
        recipientWorkspaceMemberId: input.assigneeWorkspaceMemberId,
        title: input.notificationTitle ?? 'A new lead has been assigned to you',
        body:
          input.notificationBody ??
          `Lead ${input.leadId} has been assigned to you.`,
        notificationType: 'LEAD_ASSIGNED',
        relatedRecordId: input.leadId,
        actionUrl: `/leads/${input.leadId}`,
      });
    }

    this.logger.log(
      `Lead ${input.leadId} assigned to ${input.assigneeWorkspaceMemberId} ` +
        `in workspace ${workspaceId}`,
    );

    return {
      result: {
        leadId: input.leadId,
        assignedTo: input.assigneeWorkspaceMemberId,
        notificationSent: shouldNotify,
      },
    };
  }
}
