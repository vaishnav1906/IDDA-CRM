import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowCheckStaleLeadsActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/types/workflow-check-stale-leads-action-input.type';

export type WorkflowCheckStaleLeadsActionSettings =
  BaseWorkflowActionSettings & {
    input: WorkflowCheckStaleLeadsActionInput;
  };
