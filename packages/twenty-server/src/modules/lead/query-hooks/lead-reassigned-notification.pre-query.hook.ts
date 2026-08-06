import { Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { MobileDeviceFcmService } from 'src/engine/core-modules/mobile-device/mobile-device-fcm.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type LeadWorkspaceEntity } from 'src/modules/lead/standard-objects/lead.workspace-entity';

@WorkspaceQueryHook({
  key: 'lead.updateOne',
  type: WorkspaceQueryHookType.PRE_HOOK,
})
export class LeadReassignedNotificationPreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(
    LeadReassignedNotificationPreQueryHook.name,
  );

  constructor(
    private readonly mobileDeviceFcmService: MobileDeviceFcmService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs,
  ): Promise<UpdateOneResolverArgs> {
    const newAssignedToId = (payload.data as Record<string, unknown>)
      ?.assignedToId as string | null | undefined;

    // Only act if assignedToId is explicitly being set to a non-null member
    if (!isDefined(newAssignedToId) || !newAssignedToId) {
      return payload;
    }

    const workspaceId = authContext.workspace.id;
    const leadId = payload.id;

    // Read current lead to get old assignedToId — skip push if same person
    try {
      const authCtx = buildSystemAuthContext(workspaceId);
      let oldAssignedToId: string | null = null;

      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const repo = await this.globalWorkspaceOrmManager.getRepository<LeadWorkspaceEntity>(
            workspaceId,
            'lead',
            { shouldBypassPermissionChecks: true },
          );
          const lead = await repo.findOne({
            where: { id: leadId } as any,
            select: ['assignedToId'] as any,
          });
          oldAssignedToId = (lead as any)?.assignedToId ?? null;
        },
        authCtx,
      );

      if (oldAssignedToId === newAssignedToId) {
        return payload; // no change, skip
      }

      // Fire-and-forget — don't block the mutation
      this.mobileDeviceFcmService
        .sendToMember(workspaceId, newAssignedToId, {
          title: 'Lead Assigned to You',
          body: 'A lead has been assigned to you. Tap to view.',
          data: { type: 'LEAD_ASSIGNED', leadId },
        })
        .catch((err: Error) => {
          this.logger.error(
            `FCM send failed for lead reassignment ${leadId}: ${err.message}`,
          );
        });
    } catch (err: unknown) {
      this.logger.error(
        `LeadReassignedNotificationPreQueryHook error for lead ${leadId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return payload;
  }
}
