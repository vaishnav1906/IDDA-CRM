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
import { isWorkflowCheckMissedFollowupsAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-missed-followups/guards/is-workflow-check-missed-followups-action.guard';
import { type WorkflowCheckMissedFollowupsActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-missed-followups/types/workflow-check-missed-followups-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const DEFAULT_ACTIVE_STATUSES = ['CONTACTED', 'INTERESTED', 'ASSIGNED'];
const DEFAULT_LIMIT = 100;

type LeadToWarn = {
  id: string;
  assignedToId: string | null;
  clinicName: string | null;
  nextFollowUpDate: Date | null;
};

@Injectable()
export class CheckMissedFollowupsWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(
    CheckMissedFollowupsWorkflowAction.name,
  );

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

    if (!isWorkflowCheckMissedFollowupsAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a check-missed-followups action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowCheckMissedFollowupsActionInput;

    const { workspaceId } = runInfo;
    const authContext = buildSystemAuthContext(workspaceId);

    const activeStatuses =
      input.activeStatuses ?? DEFAULT_ACTIVE_STATUSES;
    const limit = input.limitPerRun ?? DEFAULT_LIMIT;

    let totalChecked = 0;
    let leadsToWarn: LeadToWarn[] = [];

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const now = new Date();
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const leadRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'lead',
            { shouldBypassPermissionChecks: true },
          );

        // Leads with an overdue follow-up date in an active stage.
        // NULL nextFollowUpDate is excluded because NULL <= date is NULL (false in SQL).
        const candidates = await leadRepo.find({
          where: {
            nextFollowUpDate: LessThanOrEqual(now),
            status: In(activeStatuses),
          },
          take: limit,
        });

        totalChecked = candidates.length;

        if (candidates.length === 0) {
          return;
        }

        const candidateIds = candidates.map((l) => l.id);

        // Batch deduplication: find which leads were already warned today.
        const timelineRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'timelineActivity',
            { shouldBypassPermissionChecks: true },
          );

        const warnedTodayEntries = await timelineRepo.find({
          where: {
            targetLeadId: In(candidateIds),
            name: 'workflow.lead.missed_followup_warning',
            happensAt: MoreThanOrEqual(todayStart),
          },
        });

        const warnedLeadIds = new Set(
          warnedTodayEntries
            .map((t) => t.targetLeadId)
            .filter(isDefined),
        );

        leadsToWarn = candidates
          .filter((l) => !warnedLeadIds.has(l.id))
          .map((l) => ({
            id: l.id,
            assignedToId: l.assignedToId ?? null,
            clinicName: l.clinicName ?? null,
            nextFollowUpDate: l.nextFollowUpDate ?? null,
          }));
      },
      authContext,
    );

    // Dispatch notifications and write timeline events outside the DB context.
    for (const lead of leadsToWarn) {
      if (isDefined(lead.assignedToId)) {
        await this.notificationDispatchService.dispatchInApp({
          workspaceId,
          recipientWorkspaceMemberId: lead.assignedToId,
          title: 'Missed follow-up',
          body: `A scheduled follow-up for "${lead.clinicName ?? 'this lead'}" was not completed. Please take action now.`,
          notificationType: 'NEXT_STEP_MISSING',
          relatedRecordId: lead.id,
          actionUrl: `/leads/${lead.id}`,
        });
      }

      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'lead',
        targetRecordId: lead.id,
        eventName: 'workflow.lead.missed_followup_warning',
        properties: {
          message: 'Scheduled follow-up date passed without action.',
          nextFollowUpDate: lead.nextFollowUpDate?.toISOString(),
        },
      });
    }

    this.logger.log(
      `Missed follow-up check in workspace ${workspaceId}: ` +
        `checked=${totalChecked}, warned=${leadsToWarn.length}`,
    );

    return {
      result: {
        totalChecked,
        totalWarned: leadsToWarn.length,
      },
    };
  }
}
