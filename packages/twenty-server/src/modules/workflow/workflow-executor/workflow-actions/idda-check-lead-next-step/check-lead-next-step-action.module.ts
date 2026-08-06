import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { CheckLeadNextStepWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-lead-next-step/check-lead-next-step.workflow-action';

@Module({
  imports: [IddaNotificationsModule, IddaTimelineWriterModule],
  providers: [CheckLeadNextStepWorkflowAction],
  exports: [CheckLeadNextStepWorkflowAction],
})
export class CheckLeadNextStepActionModule {}
