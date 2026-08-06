import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, type Repository } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

/** Role labels whose holders should receive failure alerts. */
const ALERT_ROLE_LABELS = new Set(['Admin', 'HR', 'CTO', 'CEO']);

/**
 * Resolves the workspaceMember IDs of Admin/HR/CEO/CTO members in a
 * workspace by joining core.role → core.roleTarget → core.userWorkspace
 * → core.user → workspace.workspaceMember.
 */
@Injectable()
export class AdminResolverService {
  private readonly logger = new Logger(AdminResolverService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RoleTargetEntity)
    private readonly roleTargetRepository: Repository<RoleTargetEntity>,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  /**
   * Returns workspaceMember IDs for all users who hold an Admin, HR, CEO, or
   * CTO role in the given workspace.  Falls back to an empty array if the
   * query fails — callers should handle the empty case gracefully.
   */
  async resolveAdminAndHrWorkspaceMemberIds(
    workspaceId: string,
  ): Promise<string[]> {
    try {
      // 1. Find roles with privileged labels in this workspace
      const roles = await this.roleRepository.find({
        where: { workspaceId },
        select: ['id', 'label'],
      });

      const alertRoleIds = roles
        .filter((r) => ALERT_ROLE_LABELS.has(r.label))
        .map((r) => r.id);

      if (alertRoleIds.length === 0) {
        this.logger.warn(
          `AdminResolverService: no Admin/HR/CTO/CEO roles found in workspace ${workspaceId}`,
        );
        return [];
      }

      // 2. Find roleTargets for those roles in this workspace
      const roleTargets = await this.roleTargetRepository.find({
        where: {
          roleId: In(alertRoleIds),
        },
        select: ['userWorkspaceId'],
      });

      const userWorkspaceIds = roleTargets
        .map((rt) => rt.userWorkspaceId)
        .filter(isDefined);

      if (userWorkspaceIds.length === 0) return [];

      // 3. Find userIds from userWorkspace rows
      const userWorkspaces = await this.userWorkspaceRepository.find({
        where: {
          id: In(userWorkspaceIds),
          workspaceId,
        },
        select: ['userId'],
      });

      const userIds = userWorkspaces.map((uw) => uw.userId).filter(isDefined);

      if (userIds.length === 0) return [];

      // 4. Resolve emails from core.user
      const users = await this.userRepository.find({
        where: { id: In(userIds) },
        select: ['id', 'email'],
      });

      const emails = users.map((u) => u.email).filter(isDefined);

      if (emails.length === 0) return [];

      // 5. Find workspaceMember IDs by email match
      const authContext = buildSystemAuthContext(workspaceId);
      const wmIds: string[] = [];

      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const wmRepo = await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'workspaceMember',
            { shouldBypassPermissionChecks: true },
          );

          const members = (await wmRepo.find({
            select: ['id', 'userEmail'] as any,
          })) as any[];

          for (const member of members) {
            if (emails.includes(member.userEmail as string)) {
              wmIds.push(member.id as string);
            }
          }
        },
        authContext,
      );

      return wmIds;
    } catch (error) {
      this.logger.error(
        `AdminResolverService: failed to resolve admin workspace members: ${(error as Error).message}`,
      );
      return [];
    }
  }
}
