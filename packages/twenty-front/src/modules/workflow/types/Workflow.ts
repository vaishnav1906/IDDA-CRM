import {
  type BulkRecordsAvailability,
  type GlobalAvailability,
  type SingleRecordAvailability,
  type workflowAiAgentActionSchema,
  type workflowCodeActionSchema,
  type workflowCreateCalendarEventActionSchema,
  type workflowCreateRecordActionSchema,
  type workflowCronTriggerSchema,
  type workflowDatabaseEventTriggerSchema,
  type workflowDelayActionSchema,
  type workflowDeleteRecordActionSchema,
  type workflowDraftEmailActionSchema,
  type workflowEmptyActionSchema,
  type workflowFilterActionSchema,
  type workflowFindRecordsActionSchema,
  type workflowFormActionSchema,
  type workflowHttpRequestActionSchema,
  type workflowIfElseActionSchema,
  type workflowIteratorActionSchema,
  type workflowLogicFunctionActionSchema,
  type workflowManualTriggerSchema,
  type workflowPickRecordActionSchema,
  type workflowRunSchema,
  type workflowRunStateSchema,
  type workflowRunStatusSchema,
  type workflowRunStepStatusSchema,
  type workflowSendEmailActionSchema,
  type workflowTriggerSchema,
  type workflowUpdateRecordActionSchema,
  type workflowUpsertRecordActionSchema,
  type workflowWebhookTriggerSchema,
} from 'twenty-shared/workflow';
import { type z } from 'zod';

export type WorkflowCodeAction = z.infer<typeof workflowCodeActionSchema>;
export type WorkflowLogicFunctionAction = z.infer<
  typeof workflowLogicFunctionActionSchema
>;
export type WorkflowSendEmailAction = z.infer<
  typeof workflowSendEmailActionSchema
>;
export type WorkflowDraftEmailAction = z.infer<
  typeof workflowDraftEmailActionSchema
>;
export type WorkflowCreateCalendarEventAction = z.infer<
  typeof workflowCreateCalendarEventActionSchema
>;
export type WorkflowCreateRecordAction = z.infer<
  typeof workflowCreateRecordActionSchema
>;
export type WorkflowUpdateRecordAction = z.infer<
  typeof workflowUpdateRecordActionSchema
>;
export type WorkflowDeleteRecordAction = z.infer<
  typeof workflowDeleteRecordActionSchema
>;
export type WorkflowUpsertRecordAction = z.infer<
  typeof workflowUpsertRecordActionSchema
>;
export type WorkflowFindRecordsAction = z.infer<
  typeof workflowFindRecordsActionSchema
>;
export type WorkflowPickRecordAction = z.infer<
  typeof workflowPickRecordActionSchema
>;
export type WorkflowDelayAction = z.infer<typeof workflowDelayActionSchema>;
export type WorkflowFilterAction = z.infer<typeof workflowFilterActionSchema>;
export type WorkflowFormAction = z.infer<typeof workflowFormActionSchema>;
export type WorkflowIfElseAction = z.infer<typeof workflowIfElseActionSchema>;
export type WorkflowHttpRequestAction = z.infer<
  typeof workflowHttpRequestActionSchema
>;
export type WorkflowIteratorAction = z.infer<
  typeof workflowIteratorActionSchema
>;
export type WorkflowAiAgentAction = z.infer<typeof workflowAiAgentActionSchema>;
export type WorkflowEmptyAction = z.infer<typeof workflowEmptyActionSchema>;

// ── IDDA CRM custom action types ─────────────────────────────────────────────
// These are executed server-side only and have no twenty-shared Zod schemas.

type BaseIddaAction = {
  id: string;
  name: string;
  valid: boolean;
  nextStepIds?: string[] | null;
  position?: { x: number; y: number };
};

type BaseIddaSettings = {
  outputSchema: Record<string, unknown>;
  errorHandlingOptions: {
    retryOnFailure: { value: boolean };
    continueOnFailure: { value: boolean };
  };
};

export type WorkflowIddaNotifyAction = BaseIddaAction & {
  type: 'IDDA_NOTIFY';
  settings: BaseIddaSettings & {
    channel: 'IN_APP' | 'EMAIL' | 'BOTH';
    notificationType: string;
    input: {
      recipientWorkspaceMemberId: string;
      title: string;
      body: string;
      channel?: 'IN_APP' | 'EMAIL' | 'BOTH';
      notificationType?: string;
      actionUrl?: string;
      relatedRecordId?: string;
      relatedObjectMetadataId?: string;
    };
  };
};

export type WorkflowIddaAssignLeadAction = BaseIddaAction & {
  type: 'IDDA_ASSIGN_LEAD';
  settings: BaseIddaSettings & {
    notifyAssignee: boolean;
    input: {
      leadId: string;
      assigneeWorkspaceMemberId: string;
      notifyAssignee?: boolean;
      notificationTitle?: string;
      notificationBody?: string;
    };
  };
};

export type WorkflowIddaUpdateSlaAction = BaseIddaAction & {
  type: 'IDDA_UPDATE_SLA';
  settings: BaseIddaSettings & {
    defaultSlaHours: number;
    useBusinessCalendar: boolean;
    priorityConfig: { priority: string; slaHours: number }[];
    input: {
      recordId: string;
      objectSingularName: string;
      slaFieldName: string;
      useBusinessCalendar: boolean;
      priority?: string;
      customSlaHours?: number;
    };
  };
};

export type WorkflowIddaCreateSubscriptionTaskAction = BaseIddaAction & {
  type: 'IDDA_CREATE_SUBSCRIPTION_TASK';
  settings: BaseIddaSettings & {
    defaultDueDaysBeforeRenewal: number;
    notifyAssignee: boolean;
    input: {
      subscriptionId: string;
      renewalDate: string;
      assigneeWorkspaceMemberId: string;
      taskTitle?: string;
      taskBody?: string;
      dueDaysBeforeRenewal?: number;
    };
  };
};

export type WorkflowIddaSendTaskEmailAction = BaseIddaAction & {
  type: 'IDDA_SEND_TASK_EMAIL';
  settings: BaseIddaSettings & {
    input: {
      taskId: string;
      additionalNote?: string;
    };
  };
};

export type WorkflowIddaCheckLeadNextStepAction = BaseIddaAction & {
  type: 'IDDA_CHECK_LEAD_NEXT_STEP';
  settings: BaseIddaSettings & {
    input: { leadId: string; assignedToId?: string };
  };
};

export type WorkflowIddaCheckFirstContactSlaAction = BaseIddaAction & {
  type: 'IDDA_CHECK_FIRST_CONTACT_SLA';
  settings: BaseIddaSettings & {
    input: { leadId: string; assignedToId?: string };
  };
};

export type WorkflowIddaCheckMissedFollowupsAction = BaseIddaAction & {
  type: 'IDDA_CHECK_MISSED_FOLLOWUPS';
  settings: BaseIddaSettings & {
    input: { activeStatuses?: string[]; limitPerRun?: number };
  };
};

export type WorkflowIddaHandleOppWonAction = BaseIddaAction & {
  type: 'IDDA_HANDLE_OPP_WON';
  settings: BaseIddaSettings & {
    input: { opportunityId: string; operationsOwnerId?: string | null };
  };
};

export type WorkflowIddaCheckCandidateFollowupsAction = BaseIddaAction & {
  type: 'IDDA_CHECK_CANDIDATE_FOLLOWUPS';
  settings: BaseIddaSettings & {
    input: { activeStatuses?: string[]; limitPerRun?: number };
  };
};

export type WorkflowIddaCheckStaleLeadsAction = BaseIddaAction & {
  type: 'IDDA_CHECK_STALE_LEADS';
  settings: BaseIddaSettings & {
    input: {
      staleDaysThreshold?: number;
      activeStatuses?: string[];
      limitPerRun?: number;
    };
  };
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
  | WorkflowFilterAction
  | WorkflowIfElseAction
  | WorkflowFormAction
  | WorkflowHttpRequestAction
  | WorkflowAiAgentAction
  | WorkflowIteratorAction
  | WorkflowDelayAction
  | WorkflowEmptyAction
  | WorkflowIddaNotifyAction
  | WorkflowIddaAssignLeadAction
  | WorkflowIddaUpdateSlaAction
  | WorkflowIddaCreateSubscriptionTaskAction
  | WorkflowIddaSendTaskEmailAction
  | WorkflowIddaCheckLeadNextStepAction
  | WorkflowIddaCheckFirstContactSlaAction
  | WorkflowIddaCheckMissedFollowupsAction
  | WorkflowIddaHandleOppWonAction
  | WorkflowIddaCheckCandidateFollowupsAction
  | WorkflowIddaCheckStaleLeadsAction;

export type WorkflowActionType = WorkflowAction['type'];
export type WorkflowStep = WorkflowAction;

export type WorkflowDatabaseEventTrigger = z.infer<
  typeof workflowDatabaseEventTriggerSchema
>;
export type WorkflowManualTrigger = z.infer<typeof workflowManualTriggerSchema>;
export type WorkflowCronTrigger = z.infer<typeof workflowCronTriggerSchema>;
export type WorkflowWebhookTrigger = z.infer<
  typeof workflowWebhookTriggerSchema
>;

export type WorkflowManualTriggerSettings = WorkflowManualTrigger['settings'];
export type WorkflowManualTriggerAvailability =
  | 'EVERYWHERE'
  | 'WHEN_RECORD_SELECTED';

export type WorkflowManualTriggerAvailabilityV2 =
  | GlobalAvailability
  | SingleRecordAvailability
  | BulkRecordsAvailability;

export type WorkflowTrigger = z.infer<typeof workflowTriggerSchema>;
export type WorkflowTriggerType = WorkflowTrigger['type'];

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'DEACTIVATED';
export type WorkflowVersionStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'DEACTIVATED'
  | 'ARCHIVED';

export type WorkflowVersion = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  workflowId: string;
  trigger: WorkflowTrigger | null;
  steps: Array<WorkflowStep> | null;
  status: WorkflowVersionStatus;
  __typename: 'WorkflowVersion';
};

export type ManualTriggerWorkflowVersion = WorkflowVersion & {
  trigger: WorkflowManualTrigger | null;
};

export type WorkflowRunStatus = z.infer<typeof workflowRunStatusSchema>;

export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>;

export type WorkflowRunStepStatus = z.infer<typeof workflowRunStepStatusSchema>;

export type WorkflowRunFlow = WorkflowRunState['flow'];

export type Workflow = {
  __typename: 'Workflow';
  id: string;
  name: string;
  versions: Array<
    Pick<WorkflowVersion, 'id' | 'status' | 'name' | 'createdAt'>
  >;
  lastPublishedVersionId: string;
  statuses: Array<WorkflowStatus> | null;
};

export type WorkflowWithCurrentVersion = Workflow & {
  currentVersion: WorkflowVersion;
};
