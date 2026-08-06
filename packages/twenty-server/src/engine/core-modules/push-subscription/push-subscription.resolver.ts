import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { PushSubscriptionService } from 'src/engine/core-modules/push-subscription/push-subscription.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PermissionsGraphqlApiExceptionFilter } from 'src/engine/metadata-modules/permissions/utils/permissions-graphql-api-exception.filter';

@UsePipes(ResolverValidationPipe)
@UseFilters(
  PermissionsGraphqlApiExceptionFilter,
  PreventNestToAutoLogGraphqlErrorsFilter,
)
@CoreResolver()
export class PushSubscriptionResolver {
  constructor(
    private readonly pushSubscriptionService: PushSubscriptionService,
  ) {}

  @UseGuards(WorkspaceAuthGuard)
  @Mutation(() => Boolean)
  async subscribeToPushNotifications(
    @Args('endpoint') endpoint: string,
    @Args('p256dhKey') p256dhKey: string,
    @Args('authKey') authKey: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<boolean> {
    await this.pushSubscriptionService.subscribe(
      workspace.id,
      workspaceMemberId,
      endpoint,
      p256dhKey,
      authKey,
    );

    return true;
  }

  @UseGuards(WorkspaceAuthGuard)
  @Mutation(() => Boolean)
  async unsubscribeFromPushNotifications(
    @Args('endpoint') endpoint: string,
  ): Promise<boolean> {
    await this.pushSubscriptionService.unsubscribe(endpoint);

    return true;
  }
}
