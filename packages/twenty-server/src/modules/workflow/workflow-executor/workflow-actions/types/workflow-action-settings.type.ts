import { type OutputSchema } from 'src/modules/workflow/workflow-builder/workflow-schema/types/output-schema.type';
import { type WorkflowAiAgentActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/types/workflow-ai-agent-action-settings.type';
import { type WorkflowNotifyActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/types/workflow-notify-action-settings.type';
import { type WorkflowAssignLeadActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/types/workflow-assign-lead-action-settings.type';
import { type WorkflowUpdateSlaActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/types/workflow-update-sla-action-settings.type';
import { type WorkflowSubscriptionTaskActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/types/workflow-subscription-task-action-settings.type';
import { type WorkflowCheckLeadNextStepActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-lead-next-step/types/workflow-check-lead-next-step-action-settings.type';
import { type WorkflowCheckFirstContactSlaActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-first-contact-sla/types/workflow-check-first-contact-sla-action-settings.type';
import { type WorkflowCheckMissedFollowupsActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-missed-followups/types/workflow-check-missed-followups-action-settings.type';
import { type WorkflowHandleOppWonActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/types/workflow-handle-opp-won-action-settings.type';
import { type WorkflowCheckCandidateFollowupsActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/types/workflow-check-candidate-followups-action-settings.type';
import { type WorkflowCheckStaleLeadsActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/types/workflow-check-stale-leads-action-settings.type';
import { type WorkflowCodeActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/code/types/workflow-code-action-settings.type';
import { type WorkflowCreateCalendarEventActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/create-calendar-event/types/workflow-create-calendar-event-action-settings.type';
import { type WorkflowDelayActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/delay/types/workflow-delay-action-settings.type';
import { type WorkflowFilterActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/filter/types/workflow-filter-action-settings.type';
import { type WorkflowFormActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/form/types/workflow-form-action-settings.type';
import { type WorkflowHttpRequestActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/http-request/types/workflow-http-request-action-settings.type';
import { type WorkflowIfElseActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/if-else/types/workflow-if-else-action-settings.type';
import { type WorkflowIteratorActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/types/workflow-iterator-action-settings.type';
import { type WorkflowLogicFunctionActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/logic-function/types/workflow-logic-function-action-settings.type';
import { type WorkflowSendEmailActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/mail-sender/types/workflow-send-email-action-settings.type';
import {
  type WorkflowCreateRecordActionSettings,
  type WorkflowDeleteRecordActionSettings,
  type WorkflowFindRecordsActionSettings,
  type WorkflowPickRecordActionSettings,
  type WorkflowUpdateRecordActionSettings,
  type WorkflowUpsertRecordActionSettings,
} from 'src/modules/workflow/workflow-executor/workflow-actions/record-crud/types/workflow-record-crud-action-settings.type';

export type BaseWorkflowActionSettings = {
  outputSchema: OutputSchema;
  errorHandlingOptions: {
    retryOnFailure: {
      value: boolean;
    };
    continueOnFailure: {
      value: boolean;
    };
  };
};

export type WithExpectedOutputSchema = {
  expectedOutputSchema?: object;
};

export type WorkflowActionSettings =
  | WorkflowLogicFunctionActionSettings
  | WorkflowSendEmailActionSettings
  | WorkflowCreateCalendarEventActionSettings
  | WorkflowCodeActionSettings
  | WorkflowCreateRecordActionSettings
  | WorkflowUpdateRecordActionSettings
  | WorkflowDeleteRecordActionSettings
  | WorkflowUpsertRecordActionSettings
  | WorkflowFindRecordsActionSettings
  | WorkflowPickRecordActionSettings
  | WorkflowFormActionSettings
  | WorkflowFilterActionSettings
  | WorkflowIfElseActionSettings
  | WorkflowHttpRequestActionSettings
  | WorkflowAiAgentActionSettings
  | WorkflowDelayActionSettings
  | WorkflowIteratorActionSettings
  | WorkflowNotifyActionSettings
  | WorkflowAssignLeadActionSettings
  | WorkflowUpdateSlaActionSettings
  | WorkflowSubscriptionTaskActionSettings
  | WorkflowCheckLeadNextStepActionSettings
  | WorkflowCheckFirstContactSlaActionSettings
  | WorkflowCheckMissedFollowupsActionSettings
  | WorkflowHandleOppWonActionSettings
  | WorkflowCheckCandidateFollowupsActionSettings
  | WorkflowCheckStaleLeadsActionSettings;
