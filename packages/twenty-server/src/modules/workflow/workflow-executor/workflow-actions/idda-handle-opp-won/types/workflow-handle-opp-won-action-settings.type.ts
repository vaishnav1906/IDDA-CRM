import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowHandleOppWonActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/types/workflow-handle-opp-won-action-input.type';

export type WorkflowHandleOppWonActionSettings = BaseWorkflowActionSettings & {
  input: WorkflowHandleOppWonActionInput;
};
