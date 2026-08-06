import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { CheckFirstContactSlaWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-first-contact-sla/check-first-contact-sla.workflow-action';

@Module({
  imports: [IddaNotificationsModule, IddaTimelineWriterModule],
  providers: [CheckFirstContactSlaWorkflowAction],
  exports: [CheckFirstContactSlaWorkflowAction],
})
export class CheckFirstContactSlaActionModule {}
