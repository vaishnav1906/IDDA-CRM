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
import { isWorkflowNotifyAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/guards/is-workflow-notify-action.guard';
import { type WorkflowNotifyActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/types/workflow-notify-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';

@Injectable()
export class NotifyWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(NotifyWorkflowAction.name);

  constructor(
    private readonly notificationDispatchService: NotificationDispatchService,
  ) {}

  async execute({
    currentStepId,
    steps,
    context,
    runInfo,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({ stepId: currentStepId, steps });

    if (!isWorkflowNotifyAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a notify action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowNotifyActionInput;

    if (!isDefined(input.recipientWorkspaceMemberId)) {
      throw new WorkflowStepExecutorException(
        'recipientWorkspaceMemberId is required for notify action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    if (!isDefined(input.title) || input.title.trim() === '') {
      throw new WorkflowStepExecutorException(
        'title is required for notify action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    await this.notificationDispatchService.dispatch({
      workspaceId: runInfo.workspaceId,
      recipientWorkspaceMemberId: input.recipientWorkspaceMemberId,
      recipientEmail: input.recipientEmail,
      title: input.title,
      body: input.body ?? '',
      notificationType: input.notificationType ?? step.settings.notificationType,
      channel: input.channel ?? step.settings.channel,
      actionUrl: input.actionUrl,
      relatedRecordId: input.relatedRecordId,
      relatedObjectMetadataId: input.relatedObjectMetadataId,
    });

    this.logger.log(
      `Notification queued for workspace member ${input.recipientWorkspaceMemberId} ` +
        `in workspace ${runInfo.workspaceId}`,
    );

    return {
      result: {
        notificationQueued: true,
        recipientWorkspaceMemberId: input.recipientWorkspaceMemberId,
        channel: input.channel ?? step.settings.channel,
      },
    };
  }
}
