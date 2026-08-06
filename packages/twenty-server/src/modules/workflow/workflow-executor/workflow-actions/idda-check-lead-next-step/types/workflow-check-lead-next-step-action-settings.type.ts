import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowCheckLeadNextStepActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-lead-next-step/types/workflow-check-lead-next-step-action-input.type';

export type WorkflowCheckLeadNextStepActionSettings =
  BaseWorkflowActionSettings & {
    input: WorkflowCheckLeadNextStepActionInput;
  };
