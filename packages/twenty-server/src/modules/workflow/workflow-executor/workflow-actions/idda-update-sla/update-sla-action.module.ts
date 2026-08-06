import { Module } from '@nestjs/common';

import { BusinessCalendarModule } from 'src/engine/core-modules/business-calendar/business-calendar.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { UpdateSlaWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/update-sla.workflow-action';

@Module({
  imports: [BusinessCalendarModule, IddaTimelineWriterModule],
  providers: [UpdateSlaWorkflowAction],
  exports: [UpdateSlaWorkflowAction],
})
export class UpdateSlaActionModule {}
