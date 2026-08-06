import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { CheckStaleLeadsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/check-stale-leads.workflow-action';

@Module({
  imports: [IddaNotificationsModule, IddaTimelineWriterModule],
  providers: [CheckStaleLeadsWorkflowAction],
  exports: [CheckStaleLeadsWorkflowAction],
})
export class CheckStaleLeadsActionModule {}
