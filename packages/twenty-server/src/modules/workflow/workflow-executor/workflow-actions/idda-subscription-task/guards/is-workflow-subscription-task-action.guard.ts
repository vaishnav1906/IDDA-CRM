import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowCreateSubscriptionTaskAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowSubscriptionTaskAction = (
  action: WorkflowAction,
): action is WorkflowCreateSubscriptionTaskAction => {
  return action.type === WorkflowActionType.IDDA_CREATE_SUBSCRIPTION_TASK;
};
