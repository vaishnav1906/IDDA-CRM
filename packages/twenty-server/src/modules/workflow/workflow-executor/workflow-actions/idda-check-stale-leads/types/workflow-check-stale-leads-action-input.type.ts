export type WorkflowCheckStaleLeadsActionInput = {
  /** Number of days without an update before a lead is considered stale. */
  staleDaysThreshold?: number;
  /** Lead statuses to include in the stale check — excludes CONVERTED/LOST by default. */
  activeStatuses?: string[];
  /** Max leads to process per run (safety cap). */
  limitPerRun?: number;
};
