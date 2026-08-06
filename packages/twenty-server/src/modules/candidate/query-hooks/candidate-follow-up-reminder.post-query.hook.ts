import { Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type CandidateWorkspaceEntity } from 'src/modules/candidate/standard-objects/candidate.workspace-entity';
import { CandidateFollowUpReminderService } from 'src/modules/candidate-follow-up-reminder/services/candidate-follow-up-reminder.service';

@WorkspaceQueryHook({
  key: 'candidate.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class CandidateFollowUpReminderPostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(
    CandidateFollowUpReminderPostQueryHook.name,
  );

  constructor(
    private readonly candidateFollowUpReminderService: CandidateFollowUpReminderService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CandidateWorkspaceEntity | CandidateWorkspaceEntity[],
  ): Promise<void> {
    const candidate = Array.isArray(payload) ? payload[0] : payload;

    if (!isDefined(candidate)) {
      return;
    }

    const workspaceId = authContext.workspace.id;
    const candidateId = candidate.id;
    const actorWorkspaceMemberId =
      authContext.type === 'user' ? authContext.workspaceMemberId : undefined;

    const isFollowUpNeeded = candidate.status === 'FOLLOW_UP_NEEDED';
    const hasDate = isDefined(candidate.nextFollowUpDate);

    if (isFollowUpNeeded && hasDate) {
      const reminderAt = new Date(candidate.nextFollowUpDate!);

      if (reminderAt <= new Date()) {
        this.logger.debug(
          `CandidateFollowUpReminderPostQueryHook: skipping schedule for candidate=${candidateId} — nextFollowUpDate is in the past`,
        );
        return;
      }

      try {
        await this.candidateFollowUpReminderService.schedule({
          workspaceId,
          candidateId,
          reminderAt,
          actorWorkspaceMemberId,
        });
      } catch (error) {
        this.logger.error(
          `CandidateFollowUpReminderPostQueryHook: failed to schedule reminder for candidate=${candidateId}: ${(error as Error).message}`,
        );
      }

      return;
    }

    if (!isFollowUpNeeded) {
      try {
        await this.candidateFollowUpReminderService.cancel({
          workspaceId,
          candidateId,
          reason: 'status_changed',
          actorWorkspaceMemberId,
          clearNextFollowUpDate: hasDate,
        });
      } catch (error) {
        this.logger.error(
          `CandidateFollowUpReminderPostQueryHook: failed to cancel reminder for candidate=${candidateId}: ${(error as Error).message}`,
        );
      }
    }
  }
}
