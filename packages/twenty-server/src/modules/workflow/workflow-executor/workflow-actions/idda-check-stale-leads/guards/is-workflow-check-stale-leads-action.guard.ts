import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowCheckStaleLeadsAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowCheckStaleLeadsAction = (
  action: WorkflowAction,
): action is WorkflowCheckStaleLeadsAction =>
  action.type === WorkflowActionType.IDDA_CHECK_STALE_LEADS;
