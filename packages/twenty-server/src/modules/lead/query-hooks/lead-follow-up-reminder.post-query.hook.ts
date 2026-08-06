import { Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type LeadWorkspaceEntity } from 'src/modules/lead/standard-objects/lead.workspace-entity';
import { LeadFollowUpReminderService } from 'src/modules/lead-follow-up-reminder/services/lead-follow-up-reminder.service';

@WorkspaceQueryHook({
  key: 'lead.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class LeadFollowUpReminderPostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(LeadFollowUpReminderPostQueryHook.name);

  constructor(
    private readonly leadFollowUpReminderService: LeadFollowUpReminderService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: LeadWorkspaceEntity | LeadWorkspaceEntity[],
  ): Promise<void> {
    const lead = Array.isArray(payload) ? payload[0] : payload;

    if (!isDefined(lead)) {
      return;
    }

    const workspaceId = authContext.workspace.id;
    const leadId = lead.id;
    const actorWorkspaceMemberId =
      authContext.type === 'user' ? authContext.workspaceMemberId : undefined;

    const isFollowUpNeeded = lead.status === 'FOLLOW_UP_NEEDED';
    const hasDate = isDefined(lead.nextFollowUpDate);

    if (isFollowUpNeeded && hasDate) {
      const reminderAt = new Date(lead.nextFollowUpDate!);

      if (reminderAt <= new Date()) {
        this.logger.debug(
          `LeadFollowUpReminderPostQueryHook: skipping schedule for lead=${leadId} — nextFollowUpDate is in the past`,
        );
        return;
      }

      try {
        await this.leadFollowUpReminderService.schedule({
          workspaceId,
          leadId,
          reminderAt,
          actorWorkspaceMemberId,
        });
      } catch (error) {
        this.logger.error(
          `LeadFollowUpReminderPostQueryHook: failed to schedule reminder for lead=${leadId}: ${(error as Error).message}`,
        );
      }

      return;
    }

    if (!isFollowUpNeeded) {
      try {
        await this.leadFollowUpReminderService.cancel({
          workspaceId,
          leadId,
          reason: 'status_changed',
          actorWorkspaceMemberId,
          clearNextFollowUpDate: hasDate,
        });
      } catch (error) {
        this.logger.error(
          `LeadFollowUpReminderPostQueryHook: failed to cancel reminder for lead=${leadId}: ${(error as Error).message}`,
        );
      }
    }
  }
}
