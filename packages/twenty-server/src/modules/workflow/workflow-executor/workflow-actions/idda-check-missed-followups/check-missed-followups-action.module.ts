import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { CheckMissedFollowupsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-missed-followups/check-missed-followups.workflow-action';

@Module({
  imports: [IddaNotificationsModule, IddaTimelineWriterModule],
  providers: [CheckMissedFollowupsWorkflowAction],
  exports: [CheckMissedFollowupsWorkflowAction],
})
export class CheckMissedFollowupsActionModule {}
