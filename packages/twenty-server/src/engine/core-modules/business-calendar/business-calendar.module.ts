import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessCalendarEntity } from 'src/engine/core-modules/business-calendar/entities/business-calendar.entity';
import { BusinessCalendarResolver } from 'src/engine/core-modules/business-calendar/resolvers/business-calendar.resolver';
import { BusinessCalendarService } from 'src/engine/core-modules/business-calendar/services/business-calendar.service';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessCalendarEntity])],
  providers: [BusinessCalendarService, BusinessCalendarResolver],
  exports: [BusinessCalendarService],
})
export class BusinessCalendarModule {}
