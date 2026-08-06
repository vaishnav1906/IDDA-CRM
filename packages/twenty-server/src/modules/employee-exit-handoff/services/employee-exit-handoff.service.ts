import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { AdminResolverService } from 'src/modules/employee-exit-handoff/services/admin-resolver.service';
import {
  ACTIVE_EMPLOYMENT_STATUSES,
  EXIT_EMPLOYMENT_STATUSES,
  HANDOFF_BATCH_SIZE,
  HANDOFF_DONE_KEY_TTL_SECONDS,
  PENDING_TASK_STATUSES,
  EMPLOYEE_EXIT_HANDOFF_JOB_NAME,
  exitHandoffDoneKey,
  exitHandoffJobId,
} from 'src/modules/employee-exit-handoff/constants/exit-handoff.constants';
import { type ExitHandoffJobData } from 'src/modules/employee-exit-handoff/types/exit-handoff-job-data.type';
import { type ExitHandoffResult } from 'src/modules/employee-exit-handoff/types/exit-handoff-result.type';

@Injectable()
export class EmployeeExitHandoffService {
  private readonly logger = new Logger(EmployeeExitHandoffService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    @InjectMessageQueue(MessageQueue.delayedJobsQueue)
    private readonly delayedJobsQueue: MessageQueueService,
    private readonly redisClientService: RedisClientService,
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
    private readonly adminResolverService: AdminResolverService,
  ) {}

  // ─── Called from post-query hook ────────────────────────────────────────────

  /**
   * Inspects the updated Team record.  If the employmentStatus array now
   * contains an exit value (RESIGNED | TERMINATED) and a permanent
   * idempotency key does not yet exist, enqueues a handoff job.
   */
  async maybeEnqueueHandoff({
    workspaceId,
    teamMemberId,
    employmentStatus,
    actorWorkspaceMemberId,
  }: {
    workspaceId: string;
    teamMemberId: string;
    employmentStatus: string[];
    actorWorkspaceMemberId: string | null;
  }): Promise<void> {
    const exitStatus = this.resolveExitStatus(employmentStatus);

    if (!isDefined(exitStatus)) {
      return;
    }

    const redis = this.redisClientService.getClient();
    const doneKey = exitHandoffDoneKey(workspaceId, teamMemberId);
    const alreadyDone = await redis.get(doneKey);

    if (isDefined(alreadyDone)) {
      this.logger.log(
        `ExitHandoff: idempotency key already set for team=${teamMemberId} — skipping enqueue`,
      );
      return;
    }

    const jobId = exitHandoffJobId(workspaceId, teamMemberId);
    const payload: ExitHandoffJobData = {
      workspaceId,
      teamMemberId,
      exitStatus,
      actorWorkspaceMemberId: actorWorkspaceMemberId ?? null,
    };

    await this.delayedJobsQueue.add<ExitHandoffJobData>(
      EMPLOYEE_EXIT_HANDOFF_JOB_NAME,
      payload,
      { id: jobId },
    );

    this.logger.log(
      `ExitHandoff: enqueued job ${jobId} for team=${teamMemberId} status=${exitStatus}`,
    );
  }

  // ─── Core handoff logic (called from BullMQ job) ─────────────────────────

  async executeHandoff(data: ExitHandoffJobData): Promise<ExitHandoffResult> {
    const { workspaceId, teamMemberId, exitStatus, actorWorkspaceMemberId } =
      data;

    // ── 1. Permanent idempotency guard ────────────────────────────────────────
    const redis = this.redisClientService.getClient();
    const doneKey = exitHandoffDoneKey(workspaceId, teamMemberId);
    const alreadyDone = await redis.get(doneKey);

    if (isDefined(alreadyDone)) {
      this.logger.log(
        `ExitHandoff: already processed for team=${teamMemberId} — suppressing retry`,
      );
      return { outcome: 'ALREADY_PROCESSED' };
    }

    const authContext = buildSystemAuthContext(workspaceId);

    // ── 2. Load team member and resolve WorkspaceMember ───────────────────────
    let employeeName = 'Unknown';
    let employeeWmId: string | null = null;
    let managerTeamId: string | null = null;

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const teamRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'team',
          { shouldBypassPermissionChecks: true },
        );

        const teamMember = (await teamRepo.findOne({
          where: { id: teamMemberId },
        })) as any;

        if (!isDefined(teamMember)) {
          this.logger.warn(
            `ExitHandoff: team member ${teamMemberId} not found`,
          );
          return;
        }

        employeeName = (teamMember.name as string | null) ?? 'Unknown';
        managerTeamId =
          (teamMember.reportingManagerId as string | null) ?? null;

        // Resolve WorkspaceMember via email match
        const employeeEmail =
          (teamMember.emailPrimaryEmail as string | null) ?? null;

        if (isDefined(employeeEmail)) {
          const wmRepo = await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'workspaceMember',
            { shouldBypassPermissionChecks: true },
          );

          const wm = (await wmRepo.findOne({
            where: { userEmail: employeeEmail } as any,
          })) as any;

          employeeWmId = (wm?.id as string | null) ?? null;
        }
      },
      authContext,
    );

    // ── 3. Guard: employee must have a WorkspaceMember ────────────────────────
    if (!isDefined(employeeWmId)) {
      this.logger.warn(
        `ExitHandoff: no WorkspaceMember found for team=${teamMemberId} — notifying admins`,
      );
      await this.notifyFailure({
        workspaceId,
        reason: 'No WorkspaceMember linked to leaving employee',
        employeeName,
        exitStatus,
        pendingTaskCount: null,
        actorWorkspaceMemberId,
        authContext,
      });
      return { outcome: 'NO_WORKSPACE_MEMBER_FOR_EMPLOYEE' };
    }

    // ── 4. Guard: reporting manager must exist ────────────────────────────────
    if (!isDefined(managerTeamId)) {
      this.logger.warn(
        `ExitHandoff: no reporting manager for team=${teamMemberId}`,
      );
      const pendingCount = await this.countPendingTasks(
        workspaceId,
        employeeWmId,
        authContext,
      );
      await this.notifyFailure({
        workspaceId,
        reason: 'No Reporting Manager assigned',
        employeeName,
        exitStatus,
        pendingTaskCount: pendingCount,
        actorWorkspaceMemberId,
        authContext,
      });
      return { outcome: 'NO_REPORTING_MANAGER' };
    }

    // ── 5. Resolve manager WorkspaceMember ────────────────────────────────────
    let managerWmId: string | null = null;
    let managerName = 'Manager';
    let managerEmail: string | null = null;
    let managerIsActive = true;

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const teamRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'team',
          { shouldBypassPermissionChecks: true },
        );

        const manager = (await teamRepo.findOne({
          where: { id: managerTeamId },
        })) as any;

        if (!isDefined(manager)) return;

        managerName = (manager.name as string | null) ?? 'Manager';
        const mgrEmail =
          (manager.emailPrimaryEmail as string | null) ?? null;
        const mgrStatus: string[] =
          (manager.employmentStatus as string[] | null) ?? [];

        managerIsActive =
          mgrStatus.length === 0 ||
          mgrStatus.some((s) => ACTIVE_EMPLOYMENT_STATUSES.has(s));

        if (isDefined(mgrEmail)) {
          const wmRepo = await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'workspaceMember',
            { shouldBypassPermissionChecks: true },
          );

          const wm = (await wmRepo.findOne({
            where: { userEmail: mgrEmail } as any,
          })) as any;

          managerWmId = (wm?.id as string | null) ?? null;
          managerEmail = (wm?.userEmail as string | null) ?? null;
        }
      },
      authContext,
    );

    if (!isDefined(managerWmId)) {
      const pendingCount = await this.countPendingTasks(
        workspaceId,
        employeeWmId,
        authContext,
      );
      await this.notifyFailure({
        workspaceId,
        reason: 'Reporting Manager has no linked WorkspaceMember',
        employeeName,
        exitStatus,
        pendingTaskCount: pendingCount,
        actorWorkspaceMemberId,
        authContext,
      });
      return { outcome: 'NO_WORKSPACE_MEMBER_FOR_MANAGER' };
    }

    if (!managerIsActive) {
      const pendingCount = await this.countPendingTasks(
        workspaceId,
        employeeWmId,
        authContext,
      );
      await this.notifyFailure({
        workspaceId,
        reason: 'Reporting Manager is not in an active employment status',
        employeeName,
        exitStatus,
        pendingTaskCount: pendingCount,
        actorWorkspaceMemberId,
        authContext,
      });
      return { outcome: 'MANAGER_INACTIVE' };
    }

    // ── 6. Batch-reassign pending tasks ───────────────────────────────────────
    let transferred = 0;
    let skipped = 0;
    let failed = 0;
    let offset = 0;

    while (true) {
      const batch = await this.fetchPendingTaskBatch(
        workspaceId,
        employeeWmId,
        offset,
        authContext,
      );

      if (batch.length === 0) break;

      for (const task of batch) {
        const taskId = task.id as string;

        try {
          const result = await this.reassignTask({
            workspaceId,
            taskId,
            fromWmId: employeeWmId,
            toWmId: managerWmId,
            authContext,
          });

          if (result === 'TRANSFERRED') {
            transferred++;
            await this.writeTaskAuditEntry({
              workspaceId,
              taskId,
              fromWmId: employeeWmId,
              toWmId: managerWmId,
              teamMemberId,
              managerTeamId,
              exitStatus,
              actorWorkspaceMemberId,
            });
          } else {
            skipped++;
          }
        } catch (error) {
          failed++;
          this.logger.error(
            `ExitHandoff: failed to reassign task ${taskId}: ${(error as Error).message}`,
          );
        }
      }

      // Next page only if we got a full batch and haven't already read all
      if (batch.length < HANDOFF_BATCH_SIZE) break;
      offset += HANDOFF_BATCH_SIZE;
    }

    const outcome = failed > 0 ? 'PARTIAL_FAILURE' : 'COMPLETED';

    // ── 7. Mark idempotency done (even on partial failure — prevents re-runs) ─
    await redis.set(doneKey, '1', 'EX', HANDOFF_DONE_KEY_TTL_SECONDS);

    // ── 8. Send grouped notification to manager ───────────────────────────────
    if (isDefined(managerWmId) && (transferred > 0 || skipped > 0)) {
      const body = [
        `${transferred} pending task${transferred !== 1 ? 's have' : ' has'} been transferred to you because ${employeeName} was marked as ${this.formatStatus(exitStatus)}.`,
        skipped > 0 ? `${skipped} task${skipped !== 1 ? 's were' : ' was'} already closed or reassigned and were skipped.` : null,
        failed > 0 ? `${failed} task${failed !== 1 ? 's' : ''} could not be transferred — please check manually.` : null,
      ]
        .filter(isDefined)
        .join('\n');

      await this.notificationDispatchService.dispatch({
        workspaceId,
        recipientWorkspaceMemberId: managerWmId,
        recipientEmail: managerEmail ?? undefined,
        title: `Pending tasks transferred from ${employeeName}`,
        body,
        notificationType: 'WORKFLOW_ACTION',
        channel: isDefined(managerEmail) ? 'BOTH' : 'IN_APP',
        relatedRecordId: teamMemberId,
        actionUrl: `/tasks?filter=assignee:${managerWmId}`,
      });
    }

    this.logger.log(
      `ExitHandoff: ${outcome} for team=${teamMemberId} — transferred=${transferred} skipped=${skipped} failed=${failed}`,
    );

    return { outcome, transferred, skipped, failed };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Returns the first exit status found in the array, or null. */
  resolveExitStatus(employmentStatus: string[]): string | null {
    if (!Array.isArray(employmentStatus)) return null;
    for (const s of employmentStatus) {
      if (EXIT_EMPLOYMENT_STATUSES.has(s)) return s;
    }
    return null;
  }

  private async countPendingTasks(
    workspaceId: string,
    assigneeWmId: string,
    authContext: ReturnType<typeof buildSystemAuthContext>,
  ): Promise<number> {
    let count = 0;

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );

        count = await taskRepo.count({
          where: {
            assigneeId: assigneeWmId,
          } as any,
        });
      },
      authContext,
    );

    return count;
  }

  private async fetchPendingTaskBatch(
    workspaceId: string,
    assigneeWmId: string,
    offset: number,
    authContext: ReturnType<typeof buildSystemAuthContext>,
  ): Promise<any[]> {
    let rows: any[] = [];

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );

        // We fetch by assigneeId only (no status filter) because the
        // race-condition check in reassignTask re-validates status per task.
        rows = await taskRepo.find({
          where: { assigneeId: assigneeWmId } as any,
          select: ['id', 'status', 'assigneeId'] as any,
          skip: offset,
          take: HANDOFF_BATCH_SIZE,
        });
      },
      authContext,
    );

    return rows;
  }

  /**
   * Atomically re-checks and reassigns a single task.
   * Returns 'TRANSFERRED' or 'SKIPPED' (race condition or already closed).
   */
  private async reassignTask({
    workspaceId,
    taskId,
    fromWmId,
    toWmId,
    authContext,
  }: {
    workspaceId: string;
    taskId: string;
    fromWmId: string;
    toWmId: string;
    authContext: ReturnType<typeof buildSystemAuthContext>;
  }): Promise<'TRANSFERRED' | 'SKIPPED'> {
    let result: 'TRANSFERRED' | 'SKIPPED' = 'SKIPPED';

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );

        const fresh = (await taskRepo.findOne({
          where: { id: taskId },
        })) as any;

        if (!isDefined(fresh)) return;
        if ((fresh.assigneeId as string | null) !== fromWmId) return; // manually reassigned
        if (!PENDING_TASK_STATUSES.has(fresh.status as string)) return; // already closed
        if (isDefined(fresh.deletedAt)) return; // soft-deleted

        await taskRepo.update(taskId, { assigneeId: toWmId } as any);
        result = 'TRANSFERRED';
      },
      authContext,
    );

    return result;
  }

  private async writeTaskAuditEntry({
    workspaceId,
    taskId,
    fromWmId,
    toWmId,
    teamMemberId,
    managerTeamId,
    exitStatus,
    actorWorkspaceMemberId,
  }: {
    workspaceId: string;
    taskId: string;
    fromWmId: string;
    toWmId: string;
    teamMemberId: string;
    managerTeamId: string | null;
    exitStatus: string;
    actorWorkspaceMemberId: string | null;
  }): Promise<void> {
    await this.workflowTimelineWriterService.write({
      workspaceId,
      workspaceMemberId: actorWorkspaceMemberId ?? undefined,
      targetObjectSingularName: 'task',
      targetRecordId: taskId,
      eventName: 'workflow.employee.exit_handoff_task_reassigned',
      properties: {
        action: 'task_reassigned_on_employee_exit',
        taskId,
        fromWorkspaceMemberId: fromWmId,
        toWorkspaceMemberId: toWmId,
        leavingTeamMemberId: teamMemberId,
        reportingManagerTeamMemberId: managerTeamId,
        exitStatus,
        reassignedAt: new Date().toISOString(),
      },
    });
  }

  private async notifyFailure({
    workspaceId,
    reason,
    employeeName,
    exitStatus,
    pendingTaskCount,
    actorWorkspaceMemberId,
    authContext,
  }: {
    workspaceId: string;
    reason: string;
    employeeName: string;
    exitStatus: string;
    pendingTaskCount: number | null;
    actorWorkspaceMemberId: string | null;
    authContext: ReturnType<typeof buildSystemAuthContext>;
  }): Promise<void> {
    const adminWmIds = await this.resolveAdminAndHrWmIds(
      workspaceId,
      authContext,
    );

    const body = [
      `Could not complete task handoff for ${employeeName} (${this.formatStatus(exitStatus)}).`,
      `Reason: ${reason}.`,
      isDefined(pendingTaskCount) && pendingTaskCount > 0
        ? `${pendingTaskCount} pending task${pendingTaskCount !== 1 ? 's require' : ' requires'} manual reassignment.`
        : null,
    ]
      .filter(isDefined)
      .join('\n');

    for (const wmId of adminWmIds) {
      await this.notificationDispatchService.dispatchInApp({
        workspaceId,
        recipientWorkspaceMemberId: wmId,
        title: `⚠ Task handoff failed — ${employeeName}`,
        body,
        notificationType: 'WORKFLOW_ACTION',
        actionUrl: '/tasks',
      });
    }

    // Create a review Task so the failure is visible in the task list
    await this.createHandoffReviewTask({
      workspaceId,
      employeeName,
      exitStatus,
      reason,
      pendingTaskCount,
      assigneeWmId: actorWorkspaceMemberId ?? adminWmIds[0] ?? null,
      authContext,
    });
  }

  private async resolveAdminAndHrWmIds(
    workspaceId: string,
    _authContext: ReturnType<typeof buildSystemAuthContext>,
  ): Promise<string[]> {
    return this.adminResolverService.resolveAdminAndHrWorkspaceMemberIds(
      workspaceId,
    );
  }

  private async createHandoffReviewTask({
    workspaceId,
    employeeName,
    exitStatus,
    reason,
    pendingTaskCount,
    assigneeWmId,
    authContext,
  }: {
    workspaceId: string;
    employeeName: string;
    exitStatus: string;
    reason: string;
    pendingTaskCount: number | null;
    assigneeWmId: string | null;
    authContext: ReturnType<typeof buildSystemAuthContext>;
  }): Promise<void> {
    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const taskRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'task',
          { shouldBypassPermissionChecks: true },
        );

        const title = `[Action Required] Review tasks for ${employeeName} (${this.formatStatus(exitStatus)})`;
        const count = pendingTaskCount ?? 0;

        await taskRepo.save({
          title,
          status: 'TODO',
          assigneeId: assigneeWmId ?? undefined,
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        } as any);

        this.logger.log(
          `ExitHandoff: created review task for ${employeeName} — reason: ${reason}, pendingCount: ${count}`,
        );
      },
      authContext,
    );
  }

  private formatStatus(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  }
}
