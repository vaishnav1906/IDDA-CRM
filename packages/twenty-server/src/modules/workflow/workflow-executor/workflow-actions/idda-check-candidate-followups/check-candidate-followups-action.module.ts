import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { CheckCandidateFollowupsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/check-candidate-followups.workflow-action';

@Module({
  imports: [IddaNotificationsModule, IddaTimelineWriterModule],
  providers: [CheckCandidateFollowupsWorkflowAction],
  exports: [CheckCandidateFollowupsWorkflowAction],
})
export class CheckCandidateFollowupsActionModule {}
