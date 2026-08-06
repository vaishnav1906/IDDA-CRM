import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { resolveInput } from 'twenty-shared/utils';
import { In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowCheckStaleLeadsAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/guards/is-workflow-check-stale-leads-action.guard';
import { type WorkflowCheckStaleLeadsActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/types/workflow-check-stale-leads-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const DEFAULT_STALE_DAYS = 30;
const DEFAULT_ACTIVE_STATUSES = ['NEW', 'ASSIGNED', 'CONTACTED', 'INTERESTED'];
const DEFAULT_LIMIT = 100;

type StaleLeadToAlert = {
  id: string;
  assignedToId: string | null;
  clinicName: string | null;
  updatedAt: Date | null;
};

@Injectable()
export class CheckStaleLeadsWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(CheckStaleLeadsWorkflowAction.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
  ) {}

  async execute({
    currentStepId,
    steps,
    context,
    runInfo,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({ stepId: currentStepId, steps });

    if (!isWorkflowCheckStaleLeadsAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a check-stale-leads action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowCheckStaleLeadsActionInput;

    const { workspaceId } = runInfo;
    const authContext = buildSystemAuthContext(workspaceId);

    const staleDays = input.staleDaysThreshold ?? DEFAULT_STALE_DAYS;
    const activeStatuses = input.activeStatuses ?? DEFAULT_ACTIVE_STATUSES;
    const limit = input.limitPerRun ?? DEFAULT_LIMIT;

    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - staleDays);

    let totalChecked = 0;
    let staleLeads: StaleLeadToAlert[] = [];

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const leadRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'lead',
          { shouldBypassPermissionChecks: true },
        );

        const staleLeadRows = await leadRepo.find({
          where: {
            updatedAt: LessThanOrEqual(staleCutoff),
            status: In(activeStatuses),
          },
          take: limit,
        });

        totalChecked = staleLeadRows.length;

        if (staleLeadRows.length === 0) {
          return;
        }

        const leadIds = staleLeadRows.map((l) => l.id);

        // Dedup: skip leads already alerted this week.
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setUTCHours(0, 0, 0, 0);

        const timelineRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'timelineActivity',
            { shouldBypassPermissionChecks: true },
          );

        const alertedThisWeek = await timelineRepo.find({
          where: {
            targetLeadId: In(leadIds),
            name: 'workflow.lead.stale_alert',
            happensAt: MoreThanOrEqual(weekStart),
          },
        });

        const alertedLeadIds = new Set(
          alertedThisWeek.map((t) => t.targetLeadId).filter(isDefined),
        );

        staleLeads = staleLeadRows
          .filter((l) => !alertedLeadIds.has(l.id))
          .map((l) => ({
            id: l.id,
            assignedToId: l.assignedToId ?? null,
            clinicName: l.clinicName ?? null,
            updatedAt: l.updatedAt ?? null,
          }));
      },
      authContext,
    );

    for (const lead of staleLeads) {
      if (isDefined(lead.assignedToId)) {
        await this.notificationDispatchService.dispatchInApp({
          workspaceId,
          recipientWorkspaceMemberId: lead.assignedToId,
          title: `Stale lead — ${staleDays}+ days without activity`,
          body: `Lead "${lead.clinicName ?? 'Unknown'}" has had no activity for over ${staleDays} days. Please update or close it.`,
          notificationType: 'NEXT_STEP_MISSING',
          relatedRecordId: lead.id,
          actionUrl: `/leads/${lead.id}`,
        });
      }

      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'lead',
        targetRecordId: lead.id,
        eventName: 'workflow.lead.stale_alert',
        properties: {
          message: `Lead has had no activity for ${staleDays}+ days.`,
          staleSinceDate: lead.updatedAt?.toISOString(),
          staleDaysThreshold: staleDays,
        },
      });
    }

    this.logger.log(
      `Stale lead check in workspace ${workspaceId}: ` +
        `checked=${totalChecked}, alerted=${staleLeads.length} (threshold=${staleDays} days)`,
    );

    return {
      result: {
        totalChecked,
        totalAlerted: staleLeads.length,
        staleDaysThreshold: staleDays,
      },
    };
  }
}
