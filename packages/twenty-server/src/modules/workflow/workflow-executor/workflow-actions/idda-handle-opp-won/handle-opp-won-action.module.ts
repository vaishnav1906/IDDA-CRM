import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { HandleOppWonWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/handle-opp-won.workflow-action';

@Module({
  imports: [IddaNotificationsModule, IddaTimelineWriterModule],
  providers: [HandleOppWonWorkflowAction],
  exports: [HandleOppWonWorkflowAction],
})
export class HandleOppWonActionModule {}
