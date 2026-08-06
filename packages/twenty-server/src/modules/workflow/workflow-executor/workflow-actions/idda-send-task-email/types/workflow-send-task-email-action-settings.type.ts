import { BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowSendTaskEmailActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-send-task-email/types/workflow-send-task-email-action-input.type';

export type WorkflowSendTaskEmailActionSettings = BaseWorkflowActionSettings & {
  input: WorkflowSendTaskEmailActionInput;
  outputSchema: Record<string, unknown>;
};
