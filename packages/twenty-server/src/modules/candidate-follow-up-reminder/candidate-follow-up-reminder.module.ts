import { Module } from '@nestjs/common';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { RedisClientModule } from 'src/engine/core-modules/redis-client/redis-client.module';
import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { FireCandidateFollowUpReminderJob } from 'src/modules/candidate-follow-up-reminder/jobs/fire-candidate-follow-up-reminder.job';
import { CandidateFollowUpReminderService } from 'src/modules/candidate-follow-up-reminder/services/candidate-follow-up-reminder.service';

@Module({
  imports: [
    MessageQueueModule,
    RedisClientModule,
    IddaNotificationsModule,
    IddaTimelineWriterModule,
  ],
  providers: [CandidateFollowUpReminderService, FireCandidateFollowUpReminderJob],
  exports: [CandidateFollowUpReminderService],
})
export class CandidateFollowUpReminderModule {}
