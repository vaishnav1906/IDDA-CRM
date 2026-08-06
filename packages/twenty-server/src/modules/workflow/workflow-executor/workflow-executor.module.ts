import { Module } from '@nestjs/common';

import { BillingModule } from 'src/engine/core-modules/billing/billing.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { MetricsModule } from 'src/engine/core-modules/metrics/metrics.module';
import { WorkflowCommonModule } from 'src/modules/workflow/common/workflow-common.module';
import { WorkflowActionFactory } from 'src/modules/workflow/workflow-executor/factories/workflow-action.factory';
import { AiAgentActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/ai-agent-action.module';
import { CodeActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/code/code-action.module';
import { CreateCalendarEventActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/create-calendar-event/create-calendar-event-action.module';
import { DelayActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/delay/delay-action.module';
import { EmptyActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/empty/empty-action.module';
import { FilterActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/filter/filter-action.module';
import { FormActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/form/form-action.module';
import { HttpRequestActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/http-request/http-request-action.module';
import { IfElseActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/if-else/if-else-action.module';
import { IteratorActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/iterator-action.module';
import { LogicFunctionActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/logic-function/logic-function-action.module';
import { MailSenderActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/mail-sender/mail-sender-action.module';
import { RecordCRUDActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/record-crud-action.module';
import { WorkflowExecutorWorkspaceService } from 'src/modules/workflow/workflow-executor/workspace-services/workflow-executor.workspace-service';
import { WorkflowRunModule } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.module';
import { NotifyActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/notify-action.module';
import { AssignLeadActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/assign-lead-action.module';
import { UpdateSlaActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/update-sla-action.module';
import { SubscriptionTaskActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/subscription-task-action.module';
import { CheckLeadNextStepActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-lead-next-step/check-lead-next-step-action.module';
import { CheckFirstContactSlaActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-first-contact-sla/check-first-contact-sla-action.module';
import { CheckMissedFollowupsActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-missed-followups/check-missed-followups-action.module';
import { HandleOppWonActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/handle-opp-won-action.module';
import { SendTaskEmailActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-send-task-email/send-task-email-action.module';
import { CheckCandidateFollowupsActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/check-candidate-followups-action.module';
import { CheckStaleLeadsActionModule } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/check-stale-leads-action.module';

@Module({
  imports: [
    WorkflowCommonModule,
    WorkflowRunModule,
    CodeActionModule,
    LogicFunctionActionModule,
    DelayActionModule,
    RecordCRUDActionModule,
    FormActionModule,
    BillingModule,
    WorkspaceCacheModule,
    FilterActionModule,
    IfElseActionModule,
    IteratorActionModule,
    AiAgentActionModule,
    EmptyActionModule,
    FeatureFlagModule,
    HttpRequestActionModule,
    MailSenderActionModule,
    CreateCalendarEventActionModule,
    MetricsModule,
    NotifyActionModule,
    AssignLeadActionModule,
    UpdateSlaActionModule,
    SubscriptionTaskActionModule,
    CheckLeadNextStepActionModule,
    CheckFirstContactSlaActionModule,
    CheckMissedFollowupsActionModule,
    HandleOppWonActionModule,
    SendTaskEmailActionModule,
    CheckCandidateFollowupsActionModule,
    CheckStaleLeadsActionModule,
  ],
  providers: [WorkflowExecutorWorkspaceService, WorkflowActionFactory],
  exports: [WorkflowExecutorWorkspaceService],
})
export class WorkflowExecutorModule {}
