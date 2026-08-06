import { Module } from '@nestjs/common';

import { BusinessCalendarModule } from 'src/engine/core-modules/business-calendar/business-calendar.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { WaitStateEngineService } from 'src/modules/idda-wait-state/services/wait-state-engine.service';

@Module({
  imports: [MessageQueueModule, BusinessCalendarModule],
  providers: [WaitStateEngineService],
  exports: [WaitStateEngineService],
})
export class IddaWaitStateModule {}
