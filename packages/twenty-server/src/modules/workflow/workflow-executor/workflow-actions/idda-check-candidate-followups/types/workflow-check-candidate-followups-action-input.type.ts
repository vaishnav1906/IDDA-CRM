export type WorkflowCheckCandidateFollowupsActionInput = {
  /** Candidate statuses that count as "active" — only these will be checked. */
  activeStatuses?: string[];
  /** Max candidates to process per run (safety cap). */
  limitPerRun?: number;
};
