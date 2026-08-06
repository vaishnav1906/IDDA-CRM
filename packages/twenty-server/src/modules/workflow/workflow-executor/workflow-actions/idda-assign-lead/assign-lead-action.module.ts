import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { AssignLeadWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/assign-lead.workflow-action';

@Module({
  imports: [IddaNotificationsModule, IddaTimelineWriterModule],
  providers: [AssignLeadWorkflowAction],
  exports: [AssignLeadWorkflowAction],
})
export class AssignLeadActionModule {}
