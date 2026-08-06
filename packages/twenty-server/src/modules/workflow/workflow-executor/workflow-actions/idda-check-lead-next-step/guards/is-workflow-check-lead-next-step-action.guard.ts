import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowCheckLeadNextStepAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowCheckLeadNextStepAction = (
  action: WorkflowAction,
): action is WorkflowCheckLeadNextStepAction =>
  action.type === WorkflowActionType.IDDA_CHECK_LEAD_NEXT_STEP;
