import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowCheckMissedFollowupsAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowCheckMissedFollowupsAction = (
  action: WorkflowAction,
): action is WorkflowCheckMissedFollowupsAction =>
  action.type === WorkflowActionType.IDDA_CHECK_MISSED_FOLLOWUPS;
