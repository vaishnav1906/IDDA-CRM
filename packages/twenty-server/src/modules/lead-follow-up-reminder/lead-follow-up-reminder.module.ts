import { Module } from '@nestjs/common';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { FireFollowUpReminderJob } from 'src/modules/lead-follow-up-reminder/jobs/fire-follow-up-reminder.job';
import { LeadFollowUpReminderService } from 'src/modules/lead-follow-up-reminder/services/lead-follow-up-reminder.service';

@Module({
  imports: [
    MessageQueueModule,
    RedisClientModule,
    IddaNotificationsModule,
    IddaTimelineWriterModule,
  ],
  providers: [LeadFollowUpReminderService, FireFollowUpReminderJob],
  exports: [LeadFollowUpReminderService],
})
export class LeadFollowUpReminderModule {}
