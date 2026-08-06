export type WorkflowCheckMissedFollowupsActionInput = {
  /** Statuses that count as "active" — only these leads will be checked. */
  activeStatuses?: string[];
  /** Max leads to process per run (safety cap). */
  limitPerRun?: number;
};
