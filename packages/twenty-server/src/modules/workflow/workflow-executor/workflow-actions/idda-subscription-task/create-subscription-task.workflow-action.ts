import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { resolveInput } from 'twenty-shared/utils';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowSubscriptionTaskAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/guards/is-workflow-subscription-task-action.guard';
import { type WorkflowSubscriptionTaskActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/types/workflow-subscription-task-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';

@Injectable()
export class CreateSubscriptionTaskWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(CreateSubscriptionTaskWorkflowAction.name);

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

    if (!isWorkflowSubscriptionTaskAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a create-subscription-task action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowSubscriptionTaskActionInput;

    if (!isDefined(input.subscriptionId)) {
      throw new WorkflowStepExecutorException(
        'subscriptionId is required for create-subscription-task action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    if (!isDefined(input.renewalDate)) {
      throw new WorkflowStepExecutorException(
        'renewalDate is required for create-subscription-task action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    if (!isDefined(input.assigneeWorkspaceMemberId)) {
      throw new WorkflowStepExecutorException(
        'assigneeWorkspaceMemberId is required for create-subscription-task action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const { workspaceId } = runInfo;
    const dueAt = this.computeDueDate(
      input.renewalDate,
      input.dueDaysBeforeRenewal ?? step.settings.defaultDueDaysBeforeRenewal ?? 7,
    );

    const authContext = buildSystemAuthContext(workspaceId);
    let taskId: string;

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const taskRepository = await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        'task',
        { shouldBypassPermissionChecks: true },
      );

      const task = await taskRepository.save({
        title:
          input.taskTitle ??
          `Renewal reminder for subscription ${input.subscriptionId}`,
        body:
          input.taskBody ??
          `The subscription ${input.subscriptionId} renews on ${input.renewalDate}. ` +
            `Please review and take action before the renewal date.`,
        dueAt: dueAt.toISOString(),
        assigneeId: input.assigneeWorkspaceMemberId,
        status: 'TODO',
      });

      taskId = task.id;
    }, authContext);

    await this.workflowTimelineWriterService.write({
      workspaceId,
      targetObjectSingularName: 'subscription',
      targetRecordId: input.subscriptionId,
      eventName: 'workflow.subscription.created',
      properties: {
        taskId: taskId!,
        dueAt: dueAt.toISOString(),
        renewalDate: input.renewalDate,
        assigneeId: input.assigneeWorkspaceMemberId,
      },
    });

    const shouldNotify = step.settings.notifyAssignee ?? false;

    if (shouldNotify) {
      await this.notificationDispatchService.dispatchInApp({
        workspaceId,
        recipientWorkspaceMemberId: input.assigneeWorkspaceMemberId,
        title: 'Subscription renewal task created',
        body:
          `A renewal reminder task has been created for subscription ` +
          `${input.subscriptionId}. Due: ${dueAt.toDateString()}.`,
        notificationType: 'TASK_ASSIGNED',
        relatedRecordId: taskId!,
        actionUrl: `/tasks/${taskId!}`,
      });
    }

    this.logger.log(
      `Subscription task ${taskId!} created for subscription ${input.subscriptionId} ` +
        `due ${dueAt.toISOString()} in workspace ${workspaceId}`,
    );

    return {
      result: {
        taskId: taskId!,
        subscriptionId: input.subscriptionId,
        dueAt: dueAt.toISOString(),
        assigneeWorkspaceMemberId: input.assigneeWorkspaceMemberId,
      },
    };
  }

  private computeDueDate(renewalDate: string, daysBefore: number): Date {
    const renewal = new Date(renewalDate);
    const dueMs = renewal.getTime() - daysBefore * 24 * 60 * 60 * 1000;

    return new Date(Math.max(dueMs, Date.now()));
  }
}
