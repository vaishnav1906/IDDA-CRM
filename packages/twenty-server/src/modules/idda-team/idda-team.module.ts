import { Module } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceMemberCreatedListener } from 'src/modules/idda-team/listeners/workspace-member-created.listener';
import { TeamMemberSyncService } from 'src/modules/idda-team/services/team-member-sync.service';

@Module({
  imports: [TwentyORMModule],
  providers: [TeamMemberSyncService, WorkspaceMemberCreatedListener],
  exports: [TeamMemberSyncService],
})
export class IddaTeamModule {}
