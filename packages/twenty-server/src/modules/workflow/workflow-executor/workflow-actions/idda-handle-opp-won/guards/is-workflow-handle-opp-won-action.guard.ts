import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowHandleOppWonAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowHandleOppWonAction = (
  action: WorkflowAction,
): action is WorkflowHandleOppWonAction =>
  action.type === WorkflowActionType.IDDA_HANDLE_OPP_WON;
