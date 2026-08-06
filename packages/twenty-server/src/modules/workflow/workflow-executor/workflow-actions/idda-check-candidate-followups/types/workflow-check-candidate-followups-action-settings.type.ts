import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowCheckCandidateFollowupsActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/types/workflow-check-candidate-followups-action-input.type';

export type WorkflowCheckCandidateFollowupsActionSettings =
  BaseWorkflowActionSettings & {
    input: WorkflowCheckCandidateFollowupsActionInput;
  };
