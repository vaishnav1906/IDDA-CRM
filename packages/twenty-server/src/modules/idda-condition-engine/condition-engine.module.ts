import { Module } from '@nestjs/common';

import { ConditionEngineService } from 'src/modules/idda-condition-engine/services/condition-engine.service';

@Module({
  providers: [ConditionEngineService],
  exports: [ConditionEngineService],
})
export class ConditionEngineModule {}
