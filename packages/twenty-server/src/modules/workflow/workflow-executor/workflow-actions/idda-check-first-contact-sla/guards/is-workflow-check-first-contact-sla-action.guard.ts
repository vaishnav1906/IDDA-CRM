import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowCheckFirstContactSlaAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowCheckFirstContactSlaAction = (
  action: WorkflowAction,
): action is WorkflowCheckFirstContactSlaAction =>
  action.type === WorkflowActionType.IDDA_CHECK_FIRST_CONTACT_SLA;
