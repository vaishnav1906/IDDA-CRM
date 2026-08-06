import { WorkflowActionType } from 'twenty-shared/workflow';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowSendTaskEmailAction = (
  action: WorkflowAction,
): action is WorkflowAction & { type: WorkflowActionType.IDDA_SEND_TASK_EMAIL } =>
  action.type === WorkflowActionType.IDDA_SEND_TASK_EMAIL;
