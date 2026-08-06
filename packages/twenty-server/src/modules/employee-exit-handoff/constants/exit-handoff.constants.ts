export const EMPLOYEE_EXIT_HANDOFF_JOB_NAME = 'employee-exit-handoff';

/** employmentStatus values that mean the employee is still active and should NOT trigger a handoff. */
export const ACTIVE_EMPLOYMENT_STATUSES = new Set([
  'ACTIVE',
  'ON_LEAVE',
  'NOTICE_PERIOD',
]);

/** employmentStatus values that trigger a task handoff. */
export const EXIT_EMPLOYMENT_STATUSES = new Set([
  'RESIGNED',
  'TERMINATED',
]);

/** Task statuses that should be transferred to the manager. */
export const PENDING_TASK_STATUSES = new Set(['TODO', 'IN_PROGRESS']);

/** Tasks per DB batch during reassignment. */
export const HANDOFF_BATCH_SIZE = 50;

/**
 * Redis key for the permanent "handoff completed" idempotency guard.
 * Set after a successful handoff run; prevents repeat processing if
 * the team record is edited again after the employee has already exited.
 */
export const exitHandoffDoneKey = (
  workspaceId: string,
  teamMemberId: string,
): string => `employee-exit-handoff-done:${workspaceId}:${teamMemberId}`;

/**
 * Stable BullMQ job ID used to deduplicate enqueue calls while the job is
 * still queued or processing.
 */
export const exitHandoffJobId = (
  workspaceId: string,
  teamMemberId: string,
): string => `employee-exit-handoff:${workspaceId}:${teamMemberId}`;

/** TTL for the permanent idempotency key (90 days in seconds). */
export const HANDOFF_DONE_KEY_TTL_SECONDS = 90 * 24 * 60 * 60;
