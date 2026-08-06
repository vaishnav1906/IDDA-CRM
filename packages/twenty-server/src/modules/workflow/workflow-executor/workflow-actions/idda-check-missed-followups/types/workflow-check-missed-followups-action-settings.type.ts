import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowCheckMissedFollowupsActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-missed-followups/types/workflow-check-missed-followups-action-input.type';

export type WorkflowCheckMissedFollowupsActionSettings =
  BaseWorkflowActionSettings & {
    input: WorkflowCheckMissedFollowupsActionInput;
  };
