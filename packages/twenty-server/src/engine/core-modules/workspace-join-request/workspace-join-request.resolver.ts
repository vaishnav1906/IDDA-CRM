import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceJoinRequestEntity } from 'src/engine/core-modules/workspace-join-request/workspace-join-request.entity';
import { WorkspaceJoinRequestService } from 'src/engine/core-modules/workspace-join-request/workspace-join-request.service';
import { RequestWorkspaceAccessInput } from 'src/engine/core-modules/workspace-join-request/dtos/request-workspace-access.input';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PermissionsGraphqlApiExceptionFilter } from 'src/engine/metadata-modules/permissions/utils/permissions-graphql-api-exception.filter';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@UsePipes(ResolverValidationPipe)
@UseFilters(
  PermissionsGraphqlApiExceptionFilter,
  PreventNestToAutoLogGraphqlErrorsFilter,
)
@MetadataResolver()
export class WorkspaceJoinRequestResolver {
  constructor(
    private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  @Mutation(() => WorkspaceJoinRequestEntity)
  async requestWorkspaceAccess(
    @Args('input') input: RequestWorkspaceAccessInput,
  ): Promise<WorkspaceJoinRequestEntity> {
    const workspaceId = input.workspaceId;

    if (!workspaceId) {
      throw new Error('workspaceId is required');
    }

    return this.workspaceJoinRequestService.createRequest({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      message: input.message,
      workspaceId,
    });
  }

  @UseGuards(
    WorkspaceAuthGuard,
    SettingsPermissionGuard(PermissionFlagType.WORKSPACE_MEMBERS),
  )
  @Query(() => [WorkspaceJoinRequestEntity])
  async workspaceJoinRequests(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<WorkspaceJoinRequestEntity[]> {
    return this.workspaceJoinRequestService.findPendingRequests(workspace.id);
  }

  @UseGuards(
    WorkspaceAuthGuard,
    UserAuthGuard,
    SettingsPermissionGuard(PermissionFlagType.WORKSPACE_MEMBERS),
  )
  @Mutation(() => WorkspaceJoinRequestEntity)
  async approveWorkspaceJoinRequest(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @Args('roleId', { type: () => UUIDScalarType, nullable: true })
    roleId: string | null,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() currentUser: AuthContextUser,
  ): Promise<WorkspaceJoinRequestEntity> {
    const authContext = buildSystemAuthContext(workspace.id);

    const workspaceMember =
      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const workspaceMemberRepository =
            await this.globalWorkspaceOrmManager.getRepository<WorkspaceMemberWorkspaceEntity>(
              workspace.id,
              'workspaceMember',
              { shouldBypassPermissionChecks: true },
            );

          return workspaceMemberRepository.findOneOrFail({
            where: { userId: currentUser.id },
          });
        },
        authContext,
      );

    return this.workspaceJoinRequestService.approveRequest(
      id,
      workspace.id,
      roleId,
      workspace,
      workspaceMember,
    );
  }

  @UseGuards(
    WorkspaceAuthGuard,
    SettingsPermissionGuard(PermissionFlagType.WORKSPACE_MEMBERS),
  )
  @Mutation(() => WorkspaceJoinRequestEntity)
  async rejectWorkspaceJoinRequest(
    @Args('id', { type: () => UUIDScalarType }) id: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<WorkspaceJoinRequestEntity> {
    return this.workspaceJoinRequestService.rejectRequest(id, workspace.id);
  }
}
