import { Injectable, Logger } from '@nestjs/common';

import { Queue } from 'bullmq';
import { isDefined } from 'twenty-shared/utils';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { FIRE_FOLLOW_UP_REMINDER_JOB_NAME } from 'src/modules/lead-follow-up-reminder/constants/fire-follow-up-reminder-job-name.constant';
import { type FollowUpReminderJobData } from 'src/modules/lead-follow-up-reminder/types/follow-up-reminder-job-data.type';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';

/** Maximum delayed jobs to scan when looking for stale jobs. */
const JOB_SCAN_LIMIT = 200;

/** Tasks with these statuses are considered closed. */
const CLOSED_TASK_STATUSES = new Set(['DONE', 'CANCELLED']);

export type ScheduleParams = {
  workspaceId: string;
  leadId: string;
  reminderAt: Date;
  actorWorkspaceMemberId?: string;
};

export type CancelParams = {
  workspaceId: string;
  leadId: string;
  /** Human-readable reason written to the timeline event. */
  reason?: string;
  actorWorkspaceMemberId?: string;
  /**
   * When true (default), clears lead.nextFollowUpDate in the DB.
   * Set to false when calling from an event listener that already
   * observed nextFollowUpDate being set to null — avoids a write loop.
   */
  clearNextFollowUpDate?: boolean;
};

@Injectable()
export class LeadFollowUpReminderService {
  private readonly logger = new Logger(LeadFollowUpReminderService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.delayedJobsQueue)
    private readonly delayedJobsQueue: MessageQueueService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
    private readonly redisClientService: RedisClientService,
  ) {}

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Schedule (or reschedule) a follow-up reminder for a lead.
   *
   * Flow:
   *   1. Validate reminderAt is in the future.
   *   2. Upsert exactly one open follow-up Task linked to the lead.
   *   3. Best-effort remove any existing delayed jobs for this lead.
   *   4. Enqueue a new delayed job with the minimal payload.
   *   5. Write a timeline event (scheduled or rescheduled).
   *
   * Idempotency: calling schedule() a second time replaces the existing
   * reminder. The old job is removed (best effort); if it cannot be removed
   * (e.g. already active), the stale-job check in FireFollowUpReminderJob
   * will suppress it at execution time.
   */
  async schedule(params: ScheduleParams): Promise<void> {
    const { workspaceId, leadId, reminderAt, actorWorkspaceMemberId } = params;
    const now = new Date();

    if (reminderAt <= now) {
      throw new Error(
        `Follow-up reminder must be in the future. ` +
          `Provided: ${reminderAt.toISOString()}, now: ${now.toISOString()}`,
      );
    }

    const authContext = buildSystemAuthContext(workspaceId);
    const jobPrefix = buildJobPrefix(workspaceId, leadId);

    let taskId: string | null = null;
    let isRescheduling = false;

    // ── 1. Upsert follow-up Task ────────────────────────────────────────────
    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const leadRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'lead',
          { shouldBypassPermissionChecks: true },
        );

        const lead = (await leadRepo.findOne({
          where: { id: leadId },
        })) as any;

        if (!isDefined(lead)) {
          throw new Error(
            `Lead ${leadId} not found in workspace ${workspaceId}`,
          );
        }

        const clinicName: string | null =
          (lead.clinicName as string | null) ??
          (lead.doctorName as string | null) ??
          null;

        const taskTitle = `Follow-up: ${clinicName ?? 'Lead'}`;

        // Find existing open follow-up Task via TaskTarget
        const taskTargetRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'taskTarget',
            { shouldBypassPermissionChecks: true },
          );

        const existingTargets = (await taskTargetRepo.find({
          where: { targetLeadId: leadId },
        })) as any[];

        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );

        let existingTask: any = null;

        for (const target of existingTargets) {
          if (!isDefined(target.taskId)) continue;

          const task = (await taskRepo.findOne({
            where: { id: target.taskId },
          })) as any;

          if (
            isDefined(task) &&
            !CLOSED_TASK_STATUSES.has(task.status as string) &&
            (task.title as string | null)?.startsWith('Follow-up:')
          ) {
            existingTask = task;
            break;
          }
        }

        if (isDefined(existingTask)) {
          await taskRepo.update(existingTask.id, {
            dueAt: reminderAt,
            assigneeId:
              (lead.assignedToId as string | null) ??
              (existingTask.assigneeId as string | null),
          });
          taskId = existingTask.id as string;
          isRescheduling = true;
        } else {
          const newTask = (await taskRepo.save({
            title: taskTitle,
            status: 'TODO',
            dueAt: reminderAt,
            assigneeId: (lead.assignedToId as string | null) ?? null,
          })) as any;

          taskId = newTask.id as string;

          await taskTargetRepo.save({
            taskId,
            targetLeadId: leadId,
          });
        }
      },
      authContext,
    );

    if (!isDefined(taskId)) {
      throw new Error(
        `Failed to upsert follow-up Task for lead ${leadId} in workspace ${workspaceId}`,
      );
    }

    // ── 2. Remove existing delayed jobs (best effort) ───────────────────────
    await this.removeExistingJobs(jobPrefix);

    // ── 3. Enqueue new delayed job ──────────────────────────────────────────
    const delayMs = Math.max(0, reminderAt.getTime() - Date.now());

    await this.delayedJobsQueue.add<FollowUpReminderJobData>(
      FIRE_FOLLOW_UP_REMINDER_JOB_NAME,
      { workspaceId, leadId, taskId, reminderAt: reminderAt.toISOString() },
      { id: jobPrefix, delay: delayMs },
    );

    this.logger.log(
      `Follow-up reminder ${isRescheduling ? 'rescheduled' : 'scheduled'} ` +
        `for lead ${leadId} at ${reminderAt.toISOString()} ` +
        `(taskId=${taskId}) in workspace ${workspaceId}`,
    );

    // ── 4. Write timeline event ─────────────────────────────────────────────
    await this.workflowTimelineWriterService.write({
      workspaceId,
      workspaceMemberId: actorWorkspaceMemberId,
      targetObjectSingularName: 'lead',
      targetRecordId: leadId,
      eventName: isRescheduling
        ? 'workflow.lead.followup_reminder_rescheduled'
        : 'workflow.lead.followup_reminder_scheduled',
      properties: {
        leadId,
        taskId,
        reminderAt: reminderAt.toISOString(),
      },
    });
  }

  /**
   * Cancel a pending follow-up reminder.
   *
   * Flow:
   *   1. Best-effort remove all delayed jobs for this lead.
   *   2. Clear lead.nextFollowUpDate (unless caller opts out).
   *   3. Mark the open follow-up Task as CANCELLED.
   *   4. Write a timeline event.
   *
   * Idempotent: safe to call twice; the second call will find no jobs to
   * remove, observe nextFollowUpDate already null, and still write the
   * timeline event.
   *
   * Loop guard: when cancel() sets nextFollowUpDate=null, the upstream
   * lead.updated event listener must NOT re-trigger cancel() or schedule().
   * The listener should only call schedule() when nextFollowUpDate transitions
   * to a non-null value, and only call cancel() when status leaves
   * FOLLOW_UP_NEEDED — neither condition is triggered by this write.
   */
  async cancel(params: CancelParams): Promise<void> {
    const {
      workspaceId,
      leadId,
      reason = 'user_cancelled',
      actorWorkspaceMemberId,
      clearNextFollowUpDate = true,
    } = params;

    const jobPrefix = buildJobPrefix(workspaceId, leadId);

    // ── 1. Remove BullMQ jobs (best effort) ────────────────────────────────
    await this.removeExistingJobs(jobPrefix);

    // ── 2. Clear nextFollowUpDate and mark Task CANCELLED ───────────────────
    if (clearNextFollowUpDate) {
      const authContext = buildSystemAuthContext(workspaceId);

      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const leadRepo = await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'lead',
            { shouldBypassPermissionChecks: true },
          );

          const lead = (await leadRepo.findOne({
            where: { id: leadId },
          })) as any;

          if (!isDefined(lead)) {
            this.logger.warn(
              `cancel(): lead ${leadId} not found in workspace ${workspaceId} — skipping DB update`,
            );
            return;
          }

          if (isDefined(lead.nextFollowUpDate)) {
            await leadRepo.update(leadId, { nextFollowUpDate: null });
          }

          const taskTargetRepo =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              'taskTarget',
              { shouldBypassPermissionChecks: true },
            );

          const targets = (await taskTargetRepo.find({
            where: { targetLeadId: leadId },
          })) as any[];

          const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'task',
            { shouldBypassPermissionChecks: true },
          );

          for (const target of targets) {
            if (!isDefined(target.taskId)) continue;

            const task = (await taskRepo.findOne({
              where: { id: target.taskId },
            })) as any;

            if (
              isDefined(task) &&
              !CLOSED_TASK_STATUSES.has(task.status as string) &&
              (task.title as string | null)?.startsWith('Follow-up:')
            ) {
              await taskRepo.update(task.id as string, {
                status: 'CANCELLED',
              });
            }
          }
        },
        authContext,
      );
    }

    this.logger.log(
      `Follow-up reminder cancelled for lead ${leadId} ` +
        `in workspace ${workspaceId} (reason: ${reason})`,
    );

    // ── 3. Write timeline event ─────────────────────────────────────────────
    await this.workflowTimelineWriterService.write({
      workspaceId,
      workspaceMemberId: actorWorkspaceMemberId,
      targetObjectSingularName: 'lead',
      targetRecordId: leadId,
      eventName: 'workflow.lead.followup_reminder_cancelled',
      properties: { leadId, reason },
    });
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Scan the delayed (and waiting) jobs for the given prefix and attempt to
   * remove each one. Errors on individual removes are swallowed: if a job is
   * already active it cannot be removed, but the stale-job check in
   * FireFollowUpReminderJob will suppress it when it fires.
   *
   * This opens a short-lived Queue instance against the shared Redis connection.
   * Calling queue.close() closes BullMQ's internal tracking but does NOT close
   * the underlying IORedis connection since it was passed externally.
   */
  async removeExistingJobs(jobPrefix: string): Promise<void> {
    const redis = this.redisClientService.getQueueClient();
    const queue = new Queue(MessageQueue.delayedJobsQueue, {
      connection: redis,
    });

    try {
      const jobs = await queue.getJobs(
        ['delayed', 'waiting'],
        0,
        JOB_SCAN_LIMIT,
      );

      const suffix = `${jobPrefix}-`;
      const matches = jobs.filter((job) => job.id?.startsWith(suffix));

      if (matches.length === 0) {
        this.logger.debug(
          `removeExistingJobs: no jobs found for prefix ${jobPrefix}`,
        );
        return;
      }

      await Promise.allSettled(
        matches.map(async (job) => {
          try {
            await job.remove();
            this.logger.debug(
              `removeExistingJobs: removed job ${job.id}`,
            );
          } catch (error) {
            this.logger.warn(
              `removeExistingJobs: could not remove job ${job.id} ` +
                `(may be active or already gone): ${(error as Error).message}`,
            );
          }
        }),
      );
    } finally {
      await queue.close();
    }
  }
}

// ─── Module-private helpers ────────────────────────────────────────────────

/**
 * Stable prefix for all BullMQ jobs belonging to a specific lead.
 *
 * The driver appends `-{uuid}` to produce the actual jobId, so the pattern
 * used when scanning for existing jobs is `${prefix}-`.
 */
export function buildJobPrefix(
  workspaceId: string,
  leadId: string,
): string {
  return `lead-reminder:${workspaceId}:${leadId}`;
}
