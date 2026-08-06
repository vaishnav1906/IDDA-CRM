import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowNotifyAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowNotifyAction = (
  action: WorkflowAction,
): action is WorkflowNotifyAction => {
  return action.type === WorkflowActionType.IDDA_NOTIFY;
};
