import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowCheckCandidateFollowupsAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowCheckCandidateFollowupsAction = (
  action: WorkflowAction,
): action is WorkflowCheckCandidateFollowupsAction =>
  action.type === WorkflowActionType.IDDA_CHECK_CANDIDATE_FOLLOWUPS;
