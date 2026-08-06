import { Module } from '@nestjs/common';

import { IddaNotificationsModule } from 'src/modules/idda-notifications/idda-notifications.module';
import { NotifyWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/notify.workflow-action';

@Module({
  imports: [IddaNotificationsModule],
  providers: [NotifyWorkflowAction],
  exports: [NotifyWorkflowAction],
})
export class NotifyActionModule {}
