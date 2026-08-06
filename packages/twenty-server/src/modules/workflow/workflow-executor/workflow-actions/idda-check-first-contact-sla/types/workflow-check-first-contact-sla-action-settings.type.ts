import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowCheckFirstContactSlaActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-first-contact-sla/types/workflow-check-first-contact-sla-action-input.type';

export type WorkflowCheckFirstContactSlaActionSettings =
  BaseWorkflowActionSettings & {
    input: WorkflowCheckFirstContactSlaActionInput;
  };
