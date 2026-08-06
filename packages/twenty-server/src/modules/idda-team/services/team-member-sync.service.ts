import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

type TeamMemberInput = {
  workspaceMemberId: string;
  name: { firstName: string; lastName: string };
  workEmail: string | null;
  userId: string | null;
};

@Injectable()
export class TeamMemberSyncService {
  private readonly logger = new Logger(TeamMemberSyncService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async upsertFromWorkspaceMember(
    workspaceId: string,
    input: TeamMemberInput,
  ): Promise<void> {
    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const teamMemberRepo =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'teamMember',
            { shouldBypassPermissionChecks: true },
          );

        const existing = await teamMemberRepo.findOne({
          where: { workspaceMemberId: input.workspaceMemberId } as any,
        });

        if (isDefined(existing)) {
          this.logger.log(
            `TeamMemberSync: record already exists for workspaceMember ${input.workspaceMemberId} in workspace ${workspaceId} — skipping`,
          );

          return;
        }

        await teamMemberRepo.insert({
          name: input.name,
          workEmail: input.workEmail,
          workspaceMemberId: input.workspaceMemberId,
          userId: input.userId,
          employmentStatus: 'ACTIVE',
          source: 'CRM User Sync',
          lastSyncedAt: new Date(),
        } as any);

        this.logger.log(
          `TeamMemberSync: created TeamMember for workspaceMember ${input.workspaceMemberId} (${input.workEmail ?? 'no email'}) in workspace ${workspaceId}`,
        );
      },
      authContext,
    );
  }
}
