import { Injectable, Logger } from '@nestjs/common';

import { Queue } from 'bullmq';
import { isDefined } from 'twenty-shared/utils';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { FIRE_CANDIDATE_FOLLOW_UP_REMINDER_JOB_NAME } from 'src/modules/candidate-follow-up-reminder/constants/fire-candidate-follow-up-reminder-job-name.constant';
import { type CandidateFollowUpReminderJobData } from 'src/modules/candidate-follow-up-reminder/types/candidate-follow-up-reminder-job-data.type';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';

/** Maximum delayed jobs to scan when looking for stale jobs. */
const JOB_SCAN_LIMIT = 200;

/** Tasks with these statuses are considered closed. */
const CLOSED_TASK_STATUSES = new Set(['DONE', 'CANCELLED']);

export type CandidateScheduleParams = {
  workspaceId: string;
  candidateId: string;
  reminderAt: Date;
  actorWorkspaceMemberId?: string;
};

export type CandidateCancelParams = {
  workspaceId: string;
  candidateId: string;
  /** Human-readable reason written to the timeline event. */
  reason?: string;
  actorWorkspaceMemberId?: string;
  /**
   * When true (default), clears candidate.nextFollowUpDate in the DB.
   * Set to false when calling from an event listener that already
   * observed nextFollowUpDate being set to null — avoids a write loop.
   */
  clearNextFollowUpDate?: boolean;
};

@Injectable()
export class CandidateFollowUpReminderService {
  private readonly logger = new Logger(CandidateFollowUpReminderService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.delayedJobsQueue)
    private readonly delayedJobsQueue: MessageQueueService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
    private readonly redisClientService: RedisClientService,
  ) {}

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Schedule (or reschedule) a follow-up reminder for a candidate.
   */
  async schedule(params: CandidateScheduleParams): Promise<void> {
    const { workspaceId, candidateId, reminderAt, actorWorkspaceMemberId } =
      params;
    const now = new Date();

    if (reminderAt <= now) {
      throw new Error(
        `Follow-up reminder must be in the future. ` +
          `Provided: ${reminderAt.toISOString()}, now: ${now.toISOString()}`,
      );
    }

    const authContext = buildSystemAuthContext(workspaceId);
    const jobPrefix = buildCandidateJobPrefix(workspaceId, candidateId);

    let taskId: string | null = null;
    let isRescheduling = false;

    // ── 1. Upsert follow-up Task ────────────────────────────────────────────
    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const candidateRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'candidate',
            { shouldBypassPermissionChecks: true },
          );

        const candidate = (await candidateRepo.findOne({
          where: { id: candidateId },
        })) as any;

        if (!isDefined(candidate)) {
          throw new Error(
            `Candidate ${candidateId} not found in workspace ${workspaceId}`,
          );
        }

        const taskTitle = `Follow-up: ${(candidate.name as string | null) ?? 'Candidate'}`;

        // Find existing open follow-up Task via TaskTarget
        const taskTargetRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'taskTarget',
            { shouldBypassPermissionChecks: true },
          );

        const existingTargets = (await taskTargetRepo.find({
          where: { targetCandidateId: candidateId },
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
              (candidate.assignedToId as string | null) ??
              (existingTask.assigneeId as string | null),
          });
          taskId = existingTask.id as string;
          isRescheduling = true;
        } else {
          const newTask = (await taskRepo.save({
            title: taskTitle,
            status: 'TODO',
            dueAt: reminderAt,
            assigneeId: (candidate.assignedToId as string | null) ?? null,
          })) as any;

          taskId = newTask.id as string;

          await taskTargetRepo.save({
            taskId,
            targetCandidateId: candidateId,
          });
        }
      },
      authContext,
    );

    if (!isDefined(taskId)) {
      throw new Error(
        `Failed to upsert follow-up Task for candidate ${candidateId} in workspace ${workspaceId}`,
      );
    }

    // ── 2. Remove existing delayed jobs (best effort) ───────────────────────
    await this.removeExistingJobs(jobPrefix);

    // ── 3. Enqueue new delayed job ──────────────────────────────────────────
    const delayMs = Math.max(0, reminderAt.getTime() - Date.now());

    await this.delayedJobsQueue.add<CandidateFollowUpReminderJobData>(
      FIRE_CANDIDATE_FOLLOW_UP_REMINDER_JOB_NAME,
      {
        workspaceId,
        candidateId,
        taskId,
        reminderAt: reminderAt.toISOString(),
      },
      { id: jobPrefix, delay: delayMs },
    );

    this.logger.log(
      `Candidate follow-up reminder ${isRescheduling ? 'rescheduled' : 'scheduled'} ` +
        `for candidate ${candidateId} at ${reminderAt.toISOString()} ` +
        `(taskId=${taskId}) in workspace ${workspaceId}`,
    );

    // ── 4. Write timeline event ─────────────────────────────────────────────
    await this.workflowTimelineWriterService.write({
      workspaceId,
      workspaceMemberId: actorWorkspaceMemberId,
      targetObjectSingularName: 'candidate',
      targetRecordId: candidateId,
      eventName: isRescheduling
        ? 'workflow.candidate.followup_reminder_rescheduled'
        : 'workflow.candidate.followup_reminder_scheduled',
      properties: {
        candidateId,
        taskId,
        reminderAt: reminderAt.toISOString(),
      },
    });
  }

  /**
   * Cancel a pending follow-up reminder for a candidate.
   */
  async cancel(params: CandidateCancelParams): Promise<void> {
    const {
      workspaceId,
      candidateId,
      reason = 'user_cancelled',
      actorWorkspaceMemberId,
      clearNextFollowUpDate = true,
    } = params;

    const jobPrefix = buildCandidateJobPrefix(workspaceId, candidateId);

    // ── 1. Remove BullMQ jobs (best effort) ────────────────────────────────
    await this.removeExistingJobs(jobPrefix);

    // ── 2. Clear nextFollowUpDate and mark Task CANCELLED ───────────────────
    if (clearNextFollowUpDate) {
      const authContext = buildSystemAuthContext(workspaceId);

      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const candidateRepo =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              'candidate',
              { shouldBypassPermissionChecks: true },
            );

          const candidate = (await candidateRepo.findOne({
            where: { id: candidateId },
          })) as any;

          if (!isDefined(candidate)) {
            this.logger.warn(
              `cancel(): candidate ${candidateId} not found in workspace ${workspaceId} — skipping DB update`,
            );
            return;
          }

          if (isDefined(candidate.nextFollowUpDate)) {
            await candidateRepo.update(candidateId, {
              nextFollowUpDate: null,
            });
          }

          const taskTargetRepo =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              'taskTarget',
              { shouldBypassPermissionChecks: true },
            );

          const targets = (await taskTargetRepo.find({
            where: { targetCandidateId: candidateId },
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
      `Candidate follow-up reminder cancelled for candidate ${candidateId} ` +
        `in workspace ${workspaceId} (reason: ${reason})`,
    );

    // ── 3. Write timeline event ─────────────────────────────────────────────
    await this.workflowTimelineWriterService.write({
      workspaceId,
      workspaceMemberId: actorWorkspaceMemberId,
      targetObjectSingularName: 'candidate',
      targetRecordId: candidateId,
      eventName: 'workflow.candidate.followup_reminder_cancelled',
      properties: { candidateId, reason },
    });
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

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
            this.logger.debug(`removeExistingJobs: removed job ${job.id}`);
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

export function buildCandidateJobPrefix(
  workspaceId: string,
  candidateId: string,
): string {
  return `candidate-reminder:${workspaceId}:${candidateId}`;
}
