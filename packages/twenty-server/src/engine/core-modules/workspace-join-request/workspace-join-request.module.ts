import { Module } from '@nestjs/common';

import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';

import { WorkspaceInvitationModule } from 'src/engine/core-modules/workspace-invitation/workspace-invitation.module';
import { WorkspaceJoinRequestEntity } from 'src/engine/core-modules/workspace-join-request/workspace-join-request.entity';
import { WorkspaceJoinRequestResolver } from 'src/engine/core-modules/workspace-join-request/workspace-join-request.resolver';
import { WorkspaceJoinRequestService } from 'src/engine/core-modules/workspace-join-request/workspace-join-request.service';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';

@Module({
  imports: [
    NestjsQueryTypeOrmModule.forFeature([WorkspaceJoinRequestEntity]),
    WorkspaceInvitationModule,
    PermissionsModule,
  ],
  exports: [WorkspaceJoinRequestService],
  providers: [WorkspaceJoinRequestService, WorkspaceJoinRequestResolver],
})
export class WorkspaceJoinRequestModule {}
