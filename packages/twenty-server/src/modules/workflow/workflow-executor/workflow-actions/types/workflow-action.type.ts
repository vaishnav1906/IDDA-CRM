import { WorkflowActionType } from 'twenty-shared/workflow';

import { type WorkflowNotifyActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/types/workflow-notify-action-settings.type';
import { type WorkflowAssignLeadActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/types/workflow-assign-lead-action-settings.type';
import { type WorkflowUpdateSlaActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/types/workflow-update-sla-action-settings.type';
import { type WorkflowSubscriptionTaskActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/types/workflow-subscription-task-action-settings.type';
import { type WorkflowCheckLeadNextStepActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-lead-next-step/types/workflow-check-lead-next-step-action-settings.type';
import { type WorkflowCheckFirstContactSlaActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-first-contact-sla/types/workflow-check-first-contact-sla-action-settings.type';
import { type WorkflowCheckMissedFollowupsActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-missed-followups/types/workflow-check-missed-followups-action-settings.type';
import { type WorkflowHandleOppWonActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/types/workflow-handle-opp-won-action-settings.type';
import { type WorkflowSendTaskEmailActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-send-task-email/types/workflow-send-task-email-action-settings.type';
import { type WorkflowCheckCandidateFollowupsActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/types/workflow-check-candidate-followups-action-settings.type';
import { type WorkflowCheckStaleLeadsActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/types/workflow-check-stale-leads-action-settings.type';
import { type WorkflowAiAgentActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/types/workflow-ai-agent-action-settings.type';
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
import { type WorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';

type BaseWorkflowAction = {
  id: string;
  name: string;
  type: WorkflowActionType;
  settings: WorkflowActionSettings;
  position?: {
    x: number;
    y: number;
  };
  valid: boolean;
  nextStepIds?: string[];
};

export type WorkflowCodeAction = BaseWorkflowAction & {
  type: WorkflowActionType.CODE;
  settings: WorkflowCodeActionSettings;
};

export type WorkflowLogicFunctionAction = BaseWorkflowAction & {
  type: WorkflowActionType.LOGIC_FUNCTION;
  settings: WorkflowLogicFunctionActionSettings;
};

export type WorkflowSendEmailAction = BaseWorkflowAction & {
  type: WorkflowActionType.SEND_EMAIL;
  settings: WorkflowSendEmailActionSettings;
};

export type WorkflowDraftEmailAction = BaseWorkflowAction & {
  type: WorkflowActionType.DRAFT_EMAIL;
  settings: WorkflowSendEmailActionSettings;
};

export type WorkflowCreateCalendarEventAction = BaseWorkflowAction & {
  type: WorkflowActionType.CREATE_CALENDAR_EVENT;
  settings: WorkflowCreateCalendarEventActionSettings;
};

export type WorkflowCreateRecordAction = BaseWorkflowAction & {
  type: WorkflowActionType.CREATE_RECORD;
  settings: WorkflowCreateRecordActionSettings;
};

export type WorkflowUpdateRecordAction = BaseWorkflowAction & {
  type: WorkflowActionType.UPDATE_RECORD;
  settings: WorkflowUpdateRecordActionSettings;
};

export type WorkflowDeleteRecordAction = BaseWorkflowAction & {
  type: WorkflowActionType.DELETE_RECORD;
  settings: WorkflowDeleteRecordActionSettings;
};

export type WorkflowUpsertRecordAction = BaseWorkflowAction & {
  type: WorkflowActionType.UPSERT_RECORD;
  settings: WorkflowUpsertRecordActionSettings;
};

export type WorkflowFindRecordsAction = BaseWorkflowAction & {
  type: WorkflowActionType.FIND_RECORDS;
  settings: WorkflowFindRecordsActionSettings;
};

export type WorkflowPickRecordAction = BaseWorkflowAction & {
  type: WorkflowActionType.PICK_RECORD;
  settings: WorkflowPickRecordActionSettings;
};

export type WorkflowFormAction = BaseWorkflowAction & {
  type: WorkflowActionType.FORM;
  settings: WorkflowFormActionSettings;
};

export type WorkflowFilterAction = BaseWorkflowAction & {
  type: WorkflowActionType.FILTER;
  settings: WorkflowFilterActionSettings;
};

export type WorkflowIfElseAction = BaseWorkflowAction & {
  type: WorkflowActionType.IF_ELSE;
  settings: WorkflowIfElseActionSettings;
};

export type WorkflowHttpRequestAction = BaseWorkflowAction & {
  type: WorkflowActionType.HTTP_REQUEST;
  settings: WorkflowHttpRequestActionSettings;
};

export type WorkflowAiAgentAction = BaseWorkflowAction & {
  type: WorkflowActionType.AI_AGENT;
  settings: WorkflowAiAgentActionSettings;
};

export type WorkflowIteratorAction = BaseWorkflowAction & {
  type: WorkflowActionType.ITERATOR;
  settings: WorkflowIteratorActionSettings;
};

export type WorkflowEmptyAction = BaseWorkflowAction & {
  type: WorkflowActionType.EMPTY;
};

export type WorkflowDelayAction = BaseWorkflowAction & {
  type: WorkflowActionType.DELAY;
  settings: WorkflowDelayActionSettings;
};

export type WorkflowNotifyAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_NOTIFY;
  settings: WorkflowNotifyActionSettings;
};

export type WorkflowAssignLeadAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_ASSIGN_LEAD;
  settings: WorkflowAssignLeadActionSettings;
};

export type WorkflowUpdateSlaAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_UPDATE_SLA;
  settings: WorkflowUpdateSlaActionSettings;
};

export type WorkflowCreateSubscriptionTaskAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_CREATE_SUBSCRIPTION_TASK;
  settings: WorkflowSubscriptionTaskActionSettings;
};

export type WorkflowCheckLeadNextStepAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_CHECK_LEAD_NEXT_STEP;
  settings: WorkflowCheckLeadNextStepActionSettings;
};

export type WorkflowCheckFirstContactSlaAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_CHECK_FIRST_CONTACT_SLA;
  settings: WorkflowCheckFirstContactSlaActionSettings;
};

export type WorkflowCheckMissedFollowupsAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_CHECK_MISSED_FOLLOWUPS;
  settings: WorkflowCheckMissedFollowupsActionSettings;
};

export type WorkflowHandleOppWonAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_HANDLE_OPP_WON;
  settings: WorkflowHandleOppWonActionSettings;
};

export type WorkflowSendTaskEmailAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_SEND_TASK_EMAIL;
  settings: WorkflowSendTaskEmailActionSettings;
};

export type WorkflowCheckCandidateFollowupsAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_CHECK_CANDIDATE_FOLLOWUPS;
  settings: WorkflowCheckCandidateFollowupsActionSettings;
};

export type WorkflowCheckStaleLeadsAction = BaseWorkflowAction & {
  type: WorkflowActionType.IDDA_CHECK_STALE_LEADS;
  settings: WorkflowCheckStaleLeadsActionSettings;
};

export type WorkflowAction =
  | WorkflowCodeAction
  | WorkflowLogicFunctionAction
  | WorkflowSendEmailAction
  | WorkflowDraftEmailAction
  | WorkflowCreateCalendarEventAction
  | WorkflowCreateRecordAction
  | WorkflowUpdateRecordAction
  | WorkflowDeleteRecordAction
  | WorkflowUpsertRecordAction
  | WorkflowFindRecordsAction
  | WorkflowPickRecordAction
  | WorkflowFormAction
  | WorkflowFilterAction
  | WorkflowIfElseAction
  | WorkflowHttpRequestAction
  | WorkflowAiAgentAction
  | WorkflowIteratorAction
  | WorkflowEmptyAction
  | WorkflowDelayAction
  | WorkflowNotifyAction
  | WorkflowAssignLeadAction
  | WorkflowUpdateSlaAction
  | WorkflowCreateSubscriptionTaskAction
  | WorkflowCheckLeadNextStepAction
  | WorkflowCheckFirstContactSlaAction
  | WorkflowCheckMissedFollowupsAction
  | WorkflowHandleOppWonAction
  | WorkflowSendTaskEmailAction
  | WorkflowCheckCandidateFollowupsAction
  | WorkflowCheckStaleLeadsAction;
