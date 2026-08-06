import { Module } from '@nestjs/common';

import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';
import { SendTaskEmailWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-send-task-email/send-task-email.workflow-action';

@Module({
  imports: [EmailModule, GlobalWorkspaceDataSourceModule],
  providers: [SendTaskEmailWorkflowAction],
  exports: [SendTaskEmailWorkflowAction],
})
export class SendTaskEmailActionModule {}
