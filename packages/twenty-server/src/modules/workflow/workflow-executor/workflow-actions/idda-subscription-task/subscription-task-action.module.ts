import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { CreateSubscriptionTaskWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/create-subscription-task.workflow-action';

@Module({
  imports: [IddaNotificationsModule, IddaTimelineWriterModule],
  providers: [CreateSubscriptionTaskWorkflowAction],
  exports: [CreateSubscriptionTaskWorkflowAction],
})
export class SubscriptionTaskActionModule {}
