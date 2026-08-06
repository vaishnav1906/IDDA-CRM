import { Logger, Scope } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { FIRE_CANDIDATE_FOLLOW_UP_REMINDER_JOB_NAME } from 'src/modules/candidate-follow-up-reminder/constants/fire-candidate-follow-up-reminder-job-name.constant';
import { type CandidateFollowUpReminderJobData } from 'src/modules/candidate-follow-up-reminder/types/candidate-follow-up-reminder-job-data.type';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';

/** Permitted difference between job.reminderAt and candidate.nextFollowUpDate (ms). */
const REMINDER_TOLERANCE_MS = 1_000;

/** Statuses that indicate a task is closed. */
const CLOSED_TASK_STATUSES = new Set(['DONE', 'CANCELLED']);

/** Statuses that allow a follow-up reminder to fire. */
const FOLLOW_UP_REMINDER_ALLOWED_STATUSES = new Set(['FOLLOW_UP_NEEDED']);

@Processor({ queueName: MessageQueue.delayedJobsQueue, scope: Scope.REQUEST })
export class FireCandidateFollowUpReminderJob {
  private readonly logger = new Logger(FireCandidateFollowUpReminderJob.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
  ) {}

  @Process(FIRE_CANDIDATE_FOLLOW_UP_REMINDER_JOB_NAME)
  async handle({
    workspaceId,
    candidateId,
    taskId,
    reminderAt,
  }: CandidateFollowUpReminderJobData): Promise<void> {
    this.logger.log(
      `FireCandidateFollowUpReminderJob: processing candidate=${candidateId} reminderAt=${reminderAt} ` +
        `workspace=${workspaceId}`,
    );

    const authContext = buildSystemAuthContext(workspaceId);
    const jobReminderAtMs = new Date(reminderAt).getTime();

    // ── Context gathered during DB phase ─────────────────────────────────────
    let suppressed = false;
    let suppressionReason = '';
    let recipientId: string | null = null;
    let recipientEmail: string | null = null;
    let notificationTitle = '';
    let notificationBody = '';

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        // ── 1. Re-fetch Candidate ─────────────────────────────────────────────
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
          suppressed = true;
          suppressionReason = 'candidate_not_found';
          return;
        }

        // ── 2. Status check ───────────────────────────────────────────────────
        if (
          !FOLLOW_UP_REMINDER_ALLOWED_STATUSES.has(candidate.status as string)
        ) {
          suppressed = true;
          suppressionReason = `candidate_status_changed:${candidate.status}`;
          return;
        }

        // ── 3. nextFollowUpDate exists ────────────────────────────────────────
        if (!isDefined(candidate.nextFollowUpDate)) {
          suppressed = true;
          suppressionReason = 'next_follow_up_date_cleared';
          return;
        }

        // ── 4. Stale-job check ────────────────────────────────────────────────
        const candidateNextFollowUpMs = new Date(
          candidate.nextFollowUpDate as Date,
        ).getTime();

        if (
          Math.abs(jobReminderAtMs - candidateNextFollowUpMs) >
          REMINDER_TOLERANCE_MS
        ) {
          suppressed = true;
          suppressionReason = `stale_job:job_reminderAt=${reminderAt},candidate_nextFollowUpDate=${(candidate.nextFollowUpDate as Date).toISOString()}`;
          return;
        }

        // ── 5. Task still open ────────────────────────────────────────────────
        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );

        const task = (await taskRepo.findOne({
          where: { id: taskId },
        })) as any;

        if (
          !isDefined(task) ||
          CLOSED_TASK_STATUSES.has(task.status as string)
        ) {
          suppressed = true;
          suppressionReason = isDefined(task)
            ? `task_closed:status=${task.status}`
            : 'task_not_found';
          return;
        }

        // ── 6. Resolve assignee ───────────────────────────────────────────────
        const assigneeId =
          (candidate.assignedToId as string | null) ??
          (task.assigneeId as string | null);

        if (!isDefined(assigneeId)) {
          suppressed = true;
          suppressionReason = 'no_assignee';
          return;
        }

        const memberRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'workspaceMember',
          { shouldBypassPermissionChecks: true },
        );

        const member = (await memberRepo.findOne({
          where: { id: assigneeId },
        })) as any;

        if (!isDefined(member)) {
          suppressed = true;
          suppressionReason = `assignee_not_found:${assigneeId}`;
          return;
        }

        recipientId = assigneeId;
        recipientEmail = (member.userEmail as string | null) ?? null;

        // ── 7. Build notification content ─────────────────────────────────────
        const candidateName =
          (candidate.name as string | null) ?? 'Candidate';
        const phone = (candidate.phone as string | null) ?? null;
        const email = (candidate.email as string | null) ?? null;
        const memberName: any = member.name;
        const assigneeName = isDefined(memberName)
          ? [memberName.firstName, memberName.lastName]
              .filter(Boolean)
              .join(' ') || 'Team Member'
          : 'Team Member';

        const reminderTimeLabel = new Date(reminderAt).toUTCString();

        notificationTitle = `Follow-up reminder: ${candidateName}`;
        notificationBody = [
          `Time to follow up with ${candidateName}.`,
          phone ? `Phone: ${phone}` : null,
          email ? `Email: ${email}` : null,
          `Reminder set for: ${reminderTimeLabel}`,
          `Assigned to: ${assigneeName}`,
        ]
          .filter(isDefined)
          .join('\n');

        // ── 8. Clear nextFollowUpDate to mark reminder as processed ───────────
        await candidateRepo.update(candidateId, { nextFollowUpDate: null });
      },
      authContext,
    );

    // ── Post-DB phase ──────────────────────────────────────────────────────────

    if (suppressed) {
      this.logger.log(
        `FireCandidateFollowUpReminderJob: suppressed for candidate=${candidateId} ` +
          `reason=${suppressionReason}`,
      );

      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'candidate',
        targetRecordId: candidateId,
        eventName: 'workflow.candidate.followup_reminder_suppressed',
        properties: {
          candidateId,
          taskId,
          reminderAt,
          suppressionReason,
        },
      });

      return;
    }

    // ── 9. Dispatch notification ────────────────────────────────────────────────
    const actionUrl = `/candidates/${candidateId}`;

    if (!isDefined(recipientEmail)) {
      this.logger.warn(
        `FireCandidateFollowUpReminderJob: no email on workspace member ${recipientId} — ` +
          `sending in-app notification only for candidate=${candidateId}`,
      );

      await this.notificationDispatchService.dispatchInApp({
        workspaceId,
        recipientWorkspaceMemberId: recipientId!,
        title: notificationTitle,
        body: notificationBody,
        notificationType: 'FOLLOW_UP_REMINDER',
        relatedRecordId: candidateId,
        actionUrl,
      });
    } else {
      await this.notificationDispatchService.dispatch({
        workspaceId,
        recipientWorkspaceMemberId: recipientId!,
        recipientEmail,
        title: notificationTitle,
        body: notificationBody,
        notificationType: 'FOLLOW_UP_REMINDER',
        channel: 'BOTH',
        relatedRecordId: candidateId,
        actionUrl,
      });
    }

    this.logger.log(
      `FireCandidateFollowUpReminderJob: notification dispatched for candidate=${candidateId} ` +
        `to member=${recipientId} (email=${recipientEmail ?? 'none'})`,
    );

    // ── 10. Write sent timeline event ───────────────────────────────────────────
    await this.workflowTimelineWriterService.write({
      workspaceId,
      targetObjectSingularName: 'candidate',
      targetRecordId: candidateId,
      eventName: 'workflow.candidate.followup_reminder_sent',
      properties: {
        candidateId,
        taskId,
        reminderAt,
        assigneeId: recipientId,
        emailSent: isDefined(recipientEmail),
      },
    });
  }
}
