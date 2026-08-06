import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowAssignLeadAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowAssignLeadAction = (
  action: WorkflowAction,
): action is WorkflowAssignLeadAction => {
  return action.type === WorkflowActionType.IDDA_ASSIGN_LEAD;
};
