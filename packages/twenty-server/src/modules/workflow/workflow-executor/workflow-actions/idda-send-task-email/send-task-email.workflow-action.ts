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
import { isWorkflowSendTaskEmailAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-send-task-email/guards/is-workflow-send-task-email-action.guard';
import { type WorkflowSendTaskEmailActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-send-task-email/types/workflow-send-task-email-action-input.type';
import { EmailSenderService } from 'src/engine/core-modules/email/email-sender.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

@Injectable()
export class SendTaskEmailWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(SendTaskEmailWorkflowAction.name);

  constructor(
    private readonly emailSenderService: EmailSenderService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async execute({
    currentStepId,
    steps,
    context,
    runInfo,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({ stepId: currentStepId, steps });

    if (!isWorkflowSendTaskEmailAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a send-task-email action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowSendTaskEmailActionInput;

    if (!isDefined(input.taskId) || input.taskId.trim() === '') {
      throw new WorkflowStepExecutorException(
        'taskId is required for send-task-email action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const { workspaceId } = runInfo;
    const authContext = buildSystemAuthContext(workspaceId);

    let recipientEmail: string | null = null;
    let recipientName = 'Team Member';
    let taskTitle = 'Task';
    let taskStatus = '';
    let taskDueAt: string | null = null;
    let taskBody = '';

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );

        const task = await taskRepo.findOne({
          where: { id: input.taskId },
        });

        if (!isDefined(task)) {
          throw new WorkflowStepExecutorException(
            `Task ${input.taskId} not found`,
            WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
          );
        }

        taskTitle = (task as any).title ?? 'Task';
        taskStatus = (task as any).status ?? '';
        taskDueAt = (task as any).dueAt
          ? new Date((task as any).dueAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : null;
        taskBody = (task as any).bodyV2?.blocknote
          ? JSON.parse((task as any).bodyV2.blocknote)
              .map((b: any) => b?.content?.map((c: any) => c?.text).join(''))
              .filter(Boolean)
              .join(' ')
          : '';

        const assigneeId = (task as any).assigneeId;
        if (!isDefined(assigneeId)) {
          throw new WorkflowStepExecutorException(
            `Task ${input.taskId} has no assignee — cannot send email`,
            WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
          );
        }

        const memberRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'workspaceMember',
            { shouldBypassPermissionChecks: true },
          );

        const member = await memberRepo.findOne({
          where: { id: assigneeId },
        });

        if (!isDefined(member)) {
          throw new WorkflowStepExecutorException(
            `Workspace member ${assigneeId} not found`,
            WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
          );
        }

        recipientEmail = (member as any).userEmail ?? null;
        const memberName = (member as any).name;
        if (isDefined(memberName)) {
          recipientName =
            [memberName.firstName, memberName.lastName]
              .filter(Boolean)
              .join(' ') || 'Team Member';
        }
      },
      authContext,
    );

    if (!isDefined(recipientEmail)) {
      throw new WorkflowStepExecutorException(
        'Assignee has no email address — cannot send task email',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const subject = `New task assigned to you: ${taskTitle}`;
    const html = this.buildEmailHtml({
      recipientName,
      taskTitle,
      taskStatus,
      taskDueAt,
      taskBody,
      taskId: input.taskId,
      additionalNote: input.additionalNote,
    });

    await this.emailSenderService.send({
      to: recipientEmail,
      subject,
      text: `Hi ${recipientName},\n\nA task has been assigned to you: ${taskTitle}\nDue: ${taskDueAt ?? 'No due date'}\n\n${taskBody}\n\n${input.additionalNote ?? ''}`,
      html,
    });

    this.logger.log(
      `Task assignment email sent to ${recipientEmail} for task ${input.taskId} in workspace ${workspaceId}`,
    );

    return {
      result: {
        emailSent: true,
        recipientEmail,
        taskId: input.taskId,
        taskTitle,
      },
    };
  }

  private buildEmailHtml({
    recipientName,
    taskTitle,
    taskStatus,
    taskDueAt,
    taskBody,
    taskId,
    additionalNote,
  }: {
    recipientName: string;
    taskTitle: string;
    taskStatus: string;
    taskDueAt: string | null;
    taskBody: string;
    taskId: string;
    additionalNote?: string;
  }): string {
    const statusBadge = taskStatus
      ? `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:#e0f2fe;color:#0369a1;font-size:12px;font-weight:600;text-transform:uppercase;">${taskStatus}</span>`
      : '';

    const dueLine = taskDueAt
      ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Due date</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${taskDueAt}</td></tr>`
      : '';

    const bodySection = taskBody
      ? `<p style="color:#374151;font-size:14px;line-height:1.6;margin-top:16px;">${taskBody}</p>`
      : '';

    const noteSection = additionalNote
      ? `<div style="margin-top:20px;padding:12px 16px;background:#fef9c3;border-left:4px solid #ca8a04;border-radius:4px;">
           <p style="margin:0;color:#713f12;font-size:13px;">${additionalNote}</p>
         </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr><td style="background:#1a1a2e;padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">IDDA CRM</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Task Assignment</p>
          <h1 style="margin:0 0 20px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;">${taskTitle}</h1>

          ${statusBadge}

          <table cellpadding="0" cellspacing="0" style="margin-top:20px;width:100%;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Assigned to</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${recipientName}</td></tr>
            ${dueLine}
          </table>

          ${bodySection}
          ${noteSection}

          <div style="margin-top:28px;">
            <a href="/tasks/${taskId}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">View Task in IDDA CRM</a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">You received this email because a task was assigned to you in IDDA CRM. Do not reply to this email.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
