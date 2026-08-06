import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowUpdateSlaAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowUpdateSlaAction = (
  action: WorkflowAction,
): action is WorkflowUpdateSlaAction => {
  return action.type === WorkflowActionType.IDDA_UPDATE_SLA;
};
