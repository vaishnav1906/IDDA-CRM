import { Module } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { EmployeeExitHandoffModule } from 'src/modules/employee-exit-handoff/employee-exit-handoff.module';
import { TeamEmploymentStatusPostQueryHook } from 'src/modules/employee-exit-handoff/query-hooks/team-employment-status.post-query.hook';
import { TeamEmploymentStatusUpdateManyPostQueryHook } from 'src/modules/employee-exit-handoff/query-hooks/team-employment-status-update-many.post-query.hook';

@Module({
  imports: [TwentyORMModule, EmployeeExitHandoffModule],
  providers: [
    TeamEmploymentStatusPostQueryHook,
    TeamEmploymentStatusUpdateManyPostQueryHook,
  ],
  exports: [],
})
export class TeamModule {}
