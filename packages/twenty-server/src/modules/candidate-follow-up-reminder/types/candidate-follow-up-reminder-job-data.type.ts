/**
 * Minimal BullMQ payload for candidate follow-up reminder jobs.
 *
 * Mutable candidate data (name, phone, email, assignee) is intentionally
 * omitted. The job processor re-fetches everything at execution time so it
 * always acts on the latest state and the stale-job check (reminderAt vs
 * candidate.nextFollowUpDate) has a reliable source of truth.
 */
export type CandidateFollowUpReminderJobData = {
  workspaceId: string;
  candidateId: string;
  taskId: string;
  reminderAt: string; // ISO-8601 UTC
};
