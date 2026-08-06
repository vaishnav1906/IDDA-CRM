import { Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { MobileDeviceFcmService } from 'src/engine/core-modules/mobile-device/mobile-device-fcm.service';
import { type LeadWorkspaceEntity } from 'src/modules/lead/standard-objects/lead.workspace-entity';

@WorkspaceQueryHook({
  key: 'lead.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class LeadAssignedNotificationPostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(
    LeadAssignedNotificationPostQueryHook.name,
  );

  constructor(
    private readonly mobileDeviceFcmService: MobileDeviceFcmService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: LeadWorkspaceEntity | LeadWorkspaceEntity[],
  ): Promise<void> {
    const lead = Array.isArray(payload) ? payload[0] : payload;

    if (!isDefined(lead) || !isDefined(lead.assignedToId)) {
      return;
    }

    const workspaceId = authContext.workspace.id;
    const clinicName = lead.clinicName ?? lead.doctorName ?? 'A clinic';

    try {
      await this.mobileDeviceFcmService.sendToMember(
        workspaceId,
        lead.assignedToId,
        {
          title: 'New Lead Assigned',
          body: `${clinicName} has been assigned to you.`,
          data: { type: 'LEAD_ASSIGNED', leadId: lead.id },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send FCM for lead ${lead.id}: ${(error as Error).message}`,
      );
    }
  }
}
