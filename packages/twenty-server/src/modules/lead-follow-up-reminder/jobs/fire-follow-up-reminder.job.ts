import { Logger, Scope } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { FIRE_FOLLOW_UP_REMINDER_JOB_NAME } from 'src/modules/lead-follow-up-reminder/constants/fire-follow-up-reminder-job-name.constant';
import { type FollowUpReminderJobData } from 'src/modules/lead-follow-up-reminder/types/follow-up-reminder-job-data.type';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';

/** Permitted difference between job.reminderAt and lead.nextFollowUpDate (ms). */
const REMINDER_TOLERANCE_MS = 1_000;

/** Statuses that indicate a task is closed. */
const CLOSED_TASK_STATUSES = new Set(['DONE', 'CANCELLED']);

/** Statuses that allow a follow-up reminder to fire. */
const FOLLOW_UP_REMINDER_ALLOWED_STATUSES = new Set(['FOLLOW_UP_NEEDED']);

@Processor({ queueName: MessageQueue.delayedJobsQueue, scope: Scope.REQUEST })
export class FireFollowUpReminderJob {
  private readonly logger = new Logger(FireFollowUpReminderJob.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
  ) {}

  @Process(FIRE_FOLLOW_UP_REMINDER_JOB_NAME)
  async handle({
    workspaceId,
    leadId,
    taskId,
    reminderAt,
  }: FollowUpReminderJobData): Promise<void> {
    this.logger.log(
      `FireFollowUpReminderJob: processing lead=${leadId} reminderAt=${reminderAt} ` +
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
        // ── 1. Re-fetch Lead ──────────────────────────────────────────────────
        const leadRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'lead',
          { shouldBypassPermissionChecks: true },
        );

        const lead = (await leadRepo.findOne({ where: { id: leadId } })) as any;

        if (!isDefined(lead)) {
          suppressed = true;
          suppressionReason = 'lead_not_found';
          return;
        }

        // ── 2. Status check ───────────────────────────────────────────────────
        if (!FOLLOW_UP_REMINDER_ALLOWED_STATUSES.has(lead.status as string)) {
          suppressed = true;
          suppressionReason = `lead_status_changed:${lead.status}`;
          return;
        }

        // ── 3. nextFollowUpDate exists ────────────────────────────────────────
        if (!isDefined(lead.nextFollowUpDate)) {
          suppressed = true;
          suppressionReason = 'next_follow_up_date_cleared';
          return;
        }

        // ── 4. Stale-job check: reminderAt must match nextFollowUpDate ─────────
        const leadNextFollowUpMs = new Date(
          lead.nextFollowUpDate as Date,
        ).getTime();

        if (Math.abs(jobReminderAtMs - leadNextFollowUpMs) > REMINDER_TOLERANCE_MS) {
          suppressed = true;
          suppressionReason = `stale_job:job_reminderAt=${reminderAt},lead_nextFollowUpDate=${(lead.nextFollowUpDate as Date).toISOString()}`;
          return;
        }

        // ── 5. Task still open ────────────────────────────────────────────────
        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );

        const task = (await taskRepo.findOne({ where: { id: taskId } })) as any;

        if (!isDefined(task) || CLOSED_TASK_STATUSES.has(task.status as string)) {
          suppressed = true;
          suppressionReason = isDefined(task)
            ? `task_closed:status=${task.status}`
            : 'task_not_found';
          return;
        }

        // ── 6. Resolve assignee ───────────────────────────────────────────────
        const assigneeId = (lead.assignedToId as string | null) ??
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

        // ── 7. Build notification content from live data ───────────────────────
        const clinicName = (lead.clinicName as string | null) ?? null;
        const doctorName = (lead.doctorName as string | null) ?? null;
        const phone = (lead.phone as string | null) ?? null;
        const city = (lead.city as string | null) ?? null;
        const memberName: any = member.name;
        const assigneeName =
          isDefined(memberName)
            ? [memberName.firstName, memberName.lastName]
                .filter(Boolean)
                .join(' ') || 'Team Member'
            : 'Team Member';

        const reminderTimeLabel = new Date(reminderAt).toUTCString();

        notificationTitle = `Follow-up reminder: ${clinicName ?? doctorName ?? 'Lead'}`;
        notificationBody = [
          `Time to follow up with ${clinicName ?? doctorName ?? 'this lead'}.`,
          doctorName ? `Doctor: ${doctorName}` : null,
          phone ? `Phone: ${phone}` : null,
          city ? `City: ${city}` : null,
          `Reminder set for: ${reminderTimeLabel}`,
          `Assigned to: ${assigneeName}`,
        ]
          .filter(isDefined)
          .join('\n');

        // ── 8. Clear nextFollowUpDate to mark reminder as processed ───────────
        // This also prevents duplicate delivery on a manual BullMQ retry:
        // the stale-job check (step 3) will suppress any re-run because
        // nextFollowUpDate will be null.
        await leadRepo.update(leadId, { nextFollowUpDate: null });
      },
      authContext,
    );

    // ── Post-DB phase ──────────────────────────────────────────────────────────

    if (suppressed) {
      this.logger.log(
        `FireFollowUpReminderJob: suppressed for lead=${leadId} ` +
          `reason=${suppressionReason}`,
      );

      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'lead',
        targetRecordId: leadId,
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: { leadId, taskId, reminderAt, suppressionReason },
      });

      return;
    }

    // ── 9. Dispatch notification ────────────────────────────────────────────────
    const actionUrl = `/leads/${leadId}`;

    if (!isDefined(recipientEmail)) {
      // Missing email: send in-app only, log the gap clearly.
      this.logger.warn(
        `FireFollowUpReminderJob: no email on workspace member ${recipientId} — ` +
          `sending in-app notification only for lead=${leadId}`,
      );

      await this.notificationDispatchService.dispatchInApp({
        workspaceId,
        recipientWorkspaceMemberId: recipientId!,
        title: notificationTitle,
        body: notificationBody,
        notificationType: 'FOLLOW_UP_REMINDER',
        relatedRecordId: leadId,
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
        relatedRecordId: leadId,
        actionUrl,
      });
    }

    this.logger.log(
      `FireFollowUpReminderJob: notification dispatched for lead=${leadId} ` +
        `to member=${recipientId} (email=${recipientEmail ?? 'none'})`,
    );

    // ── 10. Write sent timeline event ───────────────────────────────────────────
    await this.workflowTimelineWriterService.write({
      workspaceId,
      targetObjectSingularName: 'lead',
      targetRecordId: leadId,
      eventName: 'workflow.lead.followup_reminder_sent',
      properties: {
        leadId,
        taskId,
        reminderAt,
        assigneeId: recipientId,
        emailSent: isDefined(recipientEmail),
      },
    });
  }
}
