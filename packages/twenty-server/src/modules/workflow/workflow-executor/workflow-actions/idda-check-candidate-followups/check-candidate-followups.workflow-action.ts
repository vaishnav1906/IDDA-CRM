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
import { isWorkflowCheckCandidateFollowupsAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/guards/is-workflow-check-candidate-followups-action.guard';
import { type WorkflowCheckCandidateFollowupsActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/types/workflow-check-candidate-followups-action-input.type';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const DEFAULT_ACTIVE_STATUSES = ['SCREENING', 'INTERVIEWING', 'OFFER_SENT'];
const DEFAULT_LIMIT = 100;

type CandidateToWarn = {
  id: string;
  assignedToId: string | null;
  name: string | null;
  nextFollowUpDate: Date | null;
};

@Injectable()
export class CheckCandidateFollowupsWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(
    CheckCandidateFollowupsWorkflowAction.name,
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

    if (!isWorkflowCheckCandidateFollowupsAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a check-candidate-followups action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const input = resolveInput(
      step.settings.input,
      context,
    ) as WorkflowCheckCandidateFollowupsActionInput;

    const { workspaceId } = runInfo;
    const authContext = buildSystemAuthContext(workspaceId);

    const activeStatuses = input.activeStatuses ?? DEFAULT_ACTIVE_STATUSES;
    const limit = input.limitPerRun ?? DEFAULT_LIMIT;

    let totalChecked = 0;
    let candidatesToWarn: CandidateToWarn[] = [];

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const now = new Date();
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const candidateRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'candidate',
            { shouldBypassPermissionChecks: true },
          );

        const overdueCandidates = await candidateRepo.find({
          where: {
            nextFollowUpDate: LessThanOrEqual(now),
            status: In(activeStatuses),
          },
          take: limit,
        });

        totalChecked = overdueCandidates.length;

        if (overdueCandidates.length === 0) {
          return;
        }

        const candidateIds = overdueCandidates.map((c) => c.id);

        // Batch deduplication: skip candidates already warned today.
        const timelineRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'timelineActivity',
            { shouldBypassPermissionChecks: true },
          );

        const warnedTodayEntries = await timelineRepo.find({
          where: {
            targetCandidateId: In(candidateIds),
            name: 'workflow.candidate.missed_followup_warning',
            happensAt: MoreThanOrEqual(todayStart),
          },
        });

        const warnedCandidateIds = new Set(
          warnedTodayEntries
            .map((t) => t.targetCandidateId)
            .filter(isDefined),
        );

        candidatesToWarn = overdueCandidates
          .filter((c) => !warnedCandidateIds.has(c.id))
          .map((c) => ({
            id: c.id,
            assignedToId: c.assignedToId ?? null,
            name: c.name ?? null,
            nextFollowUpDate: c.nextFollowUpDate ?? null,
          }));
      },
      authContext,
    );

    for (const candidate of candidatesToWarn) {
      if (isDefined(candidate.assignedToId)) {
        await this.notificationDispatchService.dispatchInApp({
          workspaceId,
          recipientWorkspaceMemberId: candidate.assignedToId,
          title: 'Missed candidate follow-up',
          body: `A scheduled follow-up for candidate "${candidate.name ?? 'Unknown'}" was not completed. Please take action now.`,
          notificationType: 'NEXT_STEP_MISSING',
          relatedRecordId: candidate.id,
          actionUrl: `/candidates/${candidate.id}`,
        });
      }

      await this.workflowTimelineWriterService.write({
        workspaceId,
        targetObjectSingularName: 'candidate',
        targetRecordId: candidate.id,
        eventName: 'workflow.candidate.missed_followup_warning',
        properties: {
          message: 'Scheduled follow-up date passed without action.',
          nextFollowUpDate: candidate.nextFollowUpDate?.toISOString(),
        },
      });
    }

    this.logger.log(
      `Candidate follow-up check in workspace ${workspaceId}: ` +
        `checked=${totalChecked}, warned=${candidatesToWarn.length}`,
    );

    return {
      result: {
        totalChecked,
        totalWarned: candidatesToWarn.length,
      },
    };
  }
}
