import { Module } from '@nestjs/common';

import { CandidateFollowUpReminderModule } from 'src/modules/candidate-follow-up-reminder/candidate-follow-up-reminder.module';
import { CandidateFollowUpReminderPostQueryHook } from 'src/modules/candidate/query-hooks/candidate-follow-up-reminder.post-query.hook';

@Module({
  imports: [CandidateFollowUpReminderModule],
  providers: [CandidateFollowUpReminderPostQueryHook],
  exports: [],
})
export class CandidateModule {}
