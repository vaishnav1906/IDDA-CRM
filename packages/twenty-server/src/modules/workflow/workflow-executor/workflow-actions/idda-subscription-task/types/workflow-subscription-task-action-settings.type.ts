import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowSubscriptionTaskActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/types/workflow-subscription-task-action-input.type';

export type WorkflowSubscriptionTaskActionSettings = BaseWorkflowActionSettings & {
  defaultDueDaysBeforeRenewal: number;
  notifyAssignee: boolean;
  input: WorkflowSubscriptionTaskActionInput;
};
