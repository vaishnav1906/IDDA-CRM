import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowAssignLeadActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/types/workflow-assign-lead-action-input.type';

export type WorkflowAssignLeadActionSettings = BaseWorkflowActionSettings & {
  notifyAssignee: boolean;
  input: WorkflowAssignLeadActionInput;
};
