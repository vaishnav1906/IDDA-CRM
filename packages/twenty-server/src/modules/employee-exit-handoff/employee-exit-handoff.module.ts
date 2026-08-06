import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { AdminResolverService } from 'src/modules/employee-exit-handoff/services/admin-resolver.service';
import { EmployeeExitHandoffJob } from 'src/modules/employee-exit-handoff/jobs/employee-exit-handoff.job';
import { EmployeeExitHandoffService } from 'src/modules/employee-exit-handoff/services/employee-exit-handoff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      RoleTargetEntity,
      UserWorkspaceEntity,
      UserEntity,
    ]),
    MessageQueueModule,
    RedisClientModule,
    TwentyORMModule,
    IddaNotificationsModule,
    IddaTimelineWriterModule,
  ],
  providers: [AdminResolverService, EmployeeExitHandoffService, EmployeeExitHandoffJob],
  exports: [EmployeeExitHandoffService],
})
export class EmployeeExitHandoffModule {}
