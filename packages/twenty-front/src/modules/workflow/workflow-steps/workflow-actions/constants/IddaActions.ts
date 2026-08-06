import { type WorkflowActionType } from '@/workflow/types/Workflow';

export type IddaActionEntry = {
  defaultLabel: string;
  type: Extract<
    WorkflowActionType,
    | 'IDDA_NOTIFY'
    | 'IDDA_ASSIGN_LEAD'
    | 'IDDA_UPDATE_SLA'
    | 'IDDA_CREATE_SUBSCRIPTION_TASK'
    | 'IDDA_SEND_TASK_EMAIL'
    | 'IDDA_CHECK_LEAD_NEXT_STEP'
    | 'IDDA_CHECK_FIRST_CONTACT_SLA'
    | 'IDDA_CHECK_MISSED_FOLLOWUPS'
    | 'IDDA_HANDLE_OPP_WON'
    | 'IDDA_CHECK_CANDIDATE_FOLLOWUPS'
    | 'IDDA_CHECK_STALE_LEADS'
  >;
  icon: string;
};

export const IDDA_NOTIFY_ACTION: IddaActionEntry = {
  defaultLabel: 'Send Notification',
  type: 'IDDA_NOTIFY',
  icon: 'IconBell',
};

export const IDDA_ASSIGN_LEAD_ACTION: IddaActionEntry = {
  defaultLabel: 'Assign Lead',
  type: 'IDDA_ASSIGN_LEAD',
  icon: 'IconUserCheck',
};

export const IDDA_UPDATE_SLA_ACTION: IddaActionEntry = {
  defaultLabel: 'Set SLA Deadline',
  type: 'IDDA_UPDATE_SLA',
  icon: 'IconClock',
};

export const IDDA_CREATE_SUBSCRIPTION_TASK_ACTION: IddaActionEntry = {
  defaultLabel: 'Create Renewal Task',
  type: 'IDDA_CREATE_SUBSCRIPTION_TASK',
  icon: 'IconClipboardCheck',
};

export const IDDA_SEND_TASK_EMAIL_ACTION: IddaActionEntry = {
  defaultLabel: 'Send Task Email',
  type: 'IDDA_SEND_TASK_EMAIL',
  icon: 'IconMailFast',
};

export const IDDA_CHECK_LEAD_NEXT_STEP_ACTION: IddaActionEntry = {
  defaultLabel: 'Check Lead Next Step',
  type: 'IDDA_CHECK_LEAD_NEXT_STEP',
  icon: 'IconListCheck',
};

export const IDDA_CHECK_FIRST_CONTACT_SLA_ACTION: IddaActionEntry = {
  defaultLabel: 'Check First Contact SLA',
  type: 'IDDA_CHECK_FIRST_CONTACT_SLA',
  icon: 'IconClockExclamation',
};

export const IDDA_CHECK_MISSED_FOLLOWUPS_ACTION: IddaActionEntry = {
  defaultLabel: 'Check Missed Follow-Ups',
  type: 'IDDA_CHECK_MISSED_FOLLOWUPS',
  icon: 'IconAlertTriangle',
};

export const IDDA_HANDLE_OPP_WON_ACTION: IddaActionEntry = {
  defaultLabel: 'Handle Opportunity Won',
  type: 'IDDA_HANDLE_OPP_WON',
  icon: 'IconTrophy',
};

export const IDDA_CHECK_CANDIDATE_FOLLOWUPS_ACTION: IddaActionEntry = {
  defaultLabel: 'Check Candidate Follow-Ups',
  type: 'IDDA_CHECK_CANDIDATE_FOLLOWUPS',
  icon: 'IconUserCheck',
};

export const IDDA_CHECK_STALE_LEADS_ACTION: IddaActionEntry = {
  defaultLabel: 'Check Stale Leads',
  type: 'IDDA_CHECK_STALE_LEADS',
  icon: 'IconClockPause',
};

export const IDDA_ACTIONS: IddaActionEntry[] = [
  IDDA_NOTIFY_ACTION,
  IDDA_ASSIGN_LEAD_ACTION,
  IDDA_UPDATE_SLA_ACTION,
  IDDA_CREATE_SUBSCRIPTION_TASK_ACTION,
  IDDA_SEND_TASK_EMAIL_ACTION,
  IDDA_CHECK_LEAD_NEXT_STEP_ACTION,
  IDDA_CHECK_FIRST_CONTACT_SLA_ACTION,
  IDDA_CHECK_MISSED_FOLLOWUPS_ACTION,
  IDDA_HANDLE_OPP_WON_ACTION,
  IDDA_CHECK_CANDIDATE_FOLLOWUPS_ACTION,
  IDDA_CHECK_STALE_LEADS_ACTION,
];
