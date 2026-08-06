/**
 * Minimal BullMQ payload for follow-up reminder jobs.
 *
 * Mutable lead data (clinic name, doctor, phone, assignee email) is intentionally
 * omitted. The job processor re-fetches everything at execution time so it always
 * acts on the latest state and the stale-job check (reminderAt vs
 * lead.nextFollowUpDate) has a reliable source of truth.
 */
export type FollowUpReminderJobData = {
  workspaceId: string;
  leadId: string;
  taskId: string;
  reminderAt: string; // ISO-8601 UTC
};
