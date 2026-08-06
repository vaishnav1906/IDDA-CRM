import { FieldActorSource } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type EntityManager } from 'typeorm';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';

// ──────────────────────────────────────────────────────────────────────────────
// Stable UUIDs for all IDDA workflow seeds — never change these after deployment.
// ──────────────────────────────────────────────────────────────────────────────

export const IDDA_LEAD_ASSIGNMENT_WORKFLOW_ID =
  'c9e7fbc0-4a1d-4e8f-b8c3-1d2e3f4a5b6c';
export const IDDA_LEAD_ASSIGNMENT_WORKFLOW_VERSION_ID =
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const IDDA_SLA_ENFORCEMENT_WORKFLOW_ID =
  'd0e1f2a3-b4c5-6d7e-8f90-a1b2c3d4e5f6';
export const IDDA_SLA_ENFORCEMENT_WORKFLOW_VERSION_ID =
  'f0e1d2c3-b4a5-9687-fedc-ba9876543210';

export const IDDA_SUBSCRIPTION_RENEWAL_WORKFLOW_ID =
  'e1f2a3b4-c5d6-7e8f-9012-b3c4d5e6f7a8';
export const IDDA_SUBSCRIPTION_RENEWAL_WORKFLOW_VERSION_ID =
  'b1c2d3e4-f5a6-0987-dcba-0987654321fe';

export const IDDA_LEAD_DOCTOR_CONVERSION_WORKFLOW_ID =
  'f2a3b4c5-d6e7-8f90-1234-a5b6c7d8e9f0';
export const IDDA_LEAD_DOCTOR_CONVERSION_WORKFLOW_VERSION_ID =
  'a2b3c4d5-e6f7-8091-bcde-f0123456789a';

// Stable UUIDs for workflowAutomatedTrigger rows
export const IDDA_AUTO_TRIGGER_LEAD_ASSIGNMENT_ID =
  'f1a2b3c4-d5e6-7890-abcd-111122223333';
export const IDDA_AUTO_TRIGGER_SLA_ENFORCEMENT_ID =
  'a1b2c3d4-e5f6-7890-abcd-444455556666';

// Workflow 5: Lead Must Have a Next Step
export const IDDA_LEAD_NEXT_STEP_WORKFLOW_ID =
  'a3b4c5d6-e7f8-9012-bcde-f01234567890';
export const IDDA_LEAD_NEXT_STEP_WORKFLOW_VERSION_ID =
  'b3c4d5e6-f7a8-9012-bcde-012345678901';
export const IDDA_AUTO_TRIGGER_LEAD_NEXT_STEP_ID =
  'c4d5e6f7-a8b9-0123-bcde-789012345678';

// Workflow 6: First Contact SLA
export const IDDA_FIRST_CONTACT_SLA_WORKFLOW_ID =
  'a5b6c7d8-e9f0-1234-bcde-012345678901';
export const IDDA_FIRST_CONTACT_SLA_WORKFLOW_VERSION_ID =
  'b5c6d7e8-f9a0-1234-bcde-123456789012';
export const IDDA_AUTO_TRIGGER_FIRST_CONTACT_SLA_ID =
  'c5d6e7f8-a9b0-1234-bcde-234567890123';

// Workflow 7: Missed Follow-Up Alert (CRON)
export const IDDA_MISSED_FOLLOWUP_WORKFLOW_ID =
  'a9b0c1d2-e3f4-5678-bcde-678901234567';

// Workflow 8: Opportunity Won → Create Subscription and Operations Handoff
export const IDDA_OPP_WON_WORKFLOW_ID =
  'b0c1d2e3-f4a5-6789-bcde-789012345678';
export const IDDA_OPP_WON_WORKFLOW_VERSION_ID =
  'c0d1e2f3-a4b5-6789-bcde-890123456789';
export const IDDA_AUTO_TRIGGER_OPP_WON_ID =
  'd0e1f2a3-b4c5-6789-bcde-901234567890';
export const IDDA_MISSED_FOLLOWUP_WORKFLOW_VERSION_ID =
  'b9c0d1e2-f3a4-5678-bcde-789012345678';
export const IDDA_AUTO_TRIGGER_MISSED_FOLLOWUP_ID =
  'c9d0e1f2-a3b4-5678-bcde-890123456789';
// CRON auto-trigger fix for the existing subscription renewal workflow
export const IDDA_AUTO_TRIGGER_SUB_RENEWAL_CRON_ID =
  'e9f0a1b2-c3d4-5678-bcde-012345678901';

// Workflow 9: Task Assignment Email
export const IDDA_TASK_EMAIL_WORKFLOW_ID =
  'a1b2c3d4-e5f6-7890-1234-abcdef012345';
export const IDDA_TASK_EMAIL_WORKFLOW_VERSION_ID =
  'b2c3d4e5-f6a7-8901-2345-bcdef0123456';
export const IDDA_AUTO_TRIGGER_TASK_EMAIL_ID =
  'c3d4e5f6-a7b8-9012-3456-cdef01234567';

// Workflow 10: High-Priority Lead Escalation
export const IDDA_HIGH_PRIORITY_LEAD_WORKFLOW_ID =
  'f1e2d3c4-b5a6-7890-abcd-101112131415';
export const IDDA_HIGH_PRIORITY_LEAD_WORKFLOW_VERSION_ID =
  'e1d2c3b4-a5f6-7890-bcde-161718192021';
export const IDDA_AUTO_TRIGGER_HIGH_PRIORITY_LEAD_ID =
  'd1c2b3a4-f5e6-7890-cdef-222324252627';

// Workflow 11: Opportunity Lost → Debrief
export const IDDA_OPP_LOST_WORKFLOW_ID =
  'c1b2a3f4-e5d6-7890-def0-282930313233';
export const IDDA_OPP_LOST_WORKFLOW_VERSION_ID =
  'b1a2f3e4-d5c6-7890-ef01-343536373839';
export const IDDA_AUTO_TRIGGER_OPP_LOST_ID =
  'a1f2e3d4-c5b6-7890-f012-404142434445';

// Workflow 12: Candidate Assigned → Recruiter Alert
export const IDDA_CANDIDATE_ASSIGNED_WORKFLOW_ID =
  'f2e3d4c5-b6a7-8901-abcd-464748495051';
export const IDDA_CANDIDATE_ASSIGNED_WORKFLOW_VERSION_ID =
  'e2d3c4b5-a6f7-8901-bcde-525354555657';
export const IDDA_AUTO_TRIGGER_CANDIDATE_ASSIGNED_ID =
  'd2c3b4a5-f6e7-8901-cdef-585960616263';

// Workflow 13: Candidate Hired → Onboarding Notification
export const IDDA_CANDIDATE_HIRED_WORKFLOW_ID =
  'c2b3a4f5-e6d7-8901-def0-646566676869';
export const IDDA_CANDIDATE_HIRED_WORKFLOW_VERSION_ID =
  'b2a3f4e5-d6c7-8901-ef01-707172737475';
export const IDDA_AUTO_TRIGGER_CANDIDATE_HIRED_ID =
  'a2f3e4d5-c6b7-8901-f012-767778798081';

// Workflow 14: Candidate Follow-Up Reminder (CRON daily)
export const IDDA_CANDIDATE_FOLLOWUP_WORKFLOW_ID =
  'f3e4d5c6-b7a8-9012-abcd-828384858687';
export const IDDA_CANDIDATE_FOLLOWUP_WORKFLOW_VERSION_ID =
  'e3d4c5b6-a7f8-9012-bcde-888990919293';
export const IDDA_AUTO_TRIGGER_CANDIDATE_FOLLOWUP_ID =
  'd3c4b5a6-f7e8-9012-cdef-949596979899';

// Workflow 15: Stale Lead Weekly Alert (CRON weekly)
export const IDDA_STALE_LEADS_WORKFLOW_ID =
  'c3b4a5f6-e7d8-9012-def0-a0a1a2a3a4a5';
export const IDDA_STALE_LEADS_WORKFLOW_VERSION_ID =
  'b3a4f5e6-d7c8-9012-ef01-a6a7a8a9aaab';
export const IDDA_AUTO_TRIGGER_STALE_LEADS_ID =
  'a3f4e5d6-c7b8-9012-f012-acadaeafb0b1';

// Step UUIDs for Lead Must Have a Next Step workflow
const NEXT_STEP_STATUS_IF_ID = 'c3d4e5f6-a7b8-9012-bcde-123456789012';
const NEXT_STEP_CHECK_ID = 'd3e4f5a6-b7c8-9012-bcde-234567890123';

// Branch and filter UUIDs (Workflow 5)
const NEXT_STEP_BRANCH_ACTIVE_ID = 'e3f4a5b6-c7d8-9012-bcde-345678901234';
const NEXT_STEP_BRANCH_SKIP_ID = 'f3a4b5c6-d7e8-9012-bcde-456789012345';
const NEXT_STEP_FILTER_GROUP_ID = 'a4b5c6d7-e8f9-0123-bcde-567890123456';
const NEXT_STEP_FILTER_ID = 'b4c5d6e7-f8a9-0123-bcde-678901234567';

// Step UUID for Missed Follow-Up Alert (Workflow 7)
const MISSED_FU_CHECK_ID = 'd9e0f1a2-b3c4-5678-bcde-901234567890';

// Step UUIDs for Opportunity Won workflow (Workflow 8)
const OPP_WON_STATUS_IF_ID = 'aa11bb22-cc33-4444-8555-666677778888';
const OPP_WON_HANDLE_ID = 'bb22cc33-dd44-4555-8666-777788889999';
const OPP_WON_BRANCH_MATCH_ID = 'cc33dd44-ee55-4666-8777-88889999aaaa';
const OPP_WON_BRANCH_SKIP_ID = 'dd44ee55-ff66-4777-8888-9999aaaabbbb';
const OPP_WON_FILTER_GROUP_ID = 'ee55ff66-aa77-4888-8999-aaaabbbbcccc';
const OPP_WON_FILTER_STAGE_ID = 'ff66aa77-bb88-4999-8aaa-bbbbccccdddd';
const OPP_WON_FILTER_PREV_ID = 'aa77bb88-cc99-4aaa-8bbb-ccccddddeee0';

// Step UUIDs for First Contact SLA workflow (Workflow 6)
const FCS_STATUS_IF_ID = 'd5e6f7a8-b9c0-1234-bcde-345678901234';
const FCS_DELAY_ID = 'e5f6a7b8-c9d0-1234-bcde-456789012345';
const FCS_CHECK_ID = 'f5a6b7c8-d9e0-1234-bcde-567890123456';

// Branch and filter UUIDs (Workflow 6)
const FCS_BRANCH_ASSIGNED_ID = 'a6b7c8d9-e0f1-2345-bcde-678901234567';
const FCS_BRANCH_SKIP_ID = 'b6c7d8e9-f0a1-2345-bcde-789012345678';
const FCS_FILTER_GROUP_ID = 'c6d7e8f9-a0b1-2345-bcde-890123456789';
const FCS_FILTER_ID = 'd6e7f8a9-b0c1-2345-bcde-901234567890';

// Step IDs for Task Assignment Email workflow (Workflow 9)
const TASK_EMAIL_STEP_SEND = 'step-send-task-email-001';

// Step/filter UUIDs for Workflow 10: High-Priority Lead Escalation
const HP_LEAD_IF_ID = 'step-hp-lead-if-001';
const HP_LEAD_NOTIFY_ID = 'step-hp-lead-notify-001';
const HP_LEAD_FILTER_GROUP_ID = 'fgrp-hp-lead-001';
const HP_LEAD_FILTER_ID = 'filt-hp-lead-001';
const HP_LEAD_BRANCH_MATCH_ID = 'br-hp-lead-match-001';
const HP_LEAD_BRANCH_SKIP_ID = 'br-hp-lead-skip-001';

// Step/filter UUIDs for Workflow 11: Opportunity Lost
const OPP_LOST_IF_ID = 'step-opp-lost-if-001';
const OPP_LOST_NOTIFY_ID = 'step-opp-lost-notify-001';
const OPP_LOST_FILTER_GROUP_ID = 'fgrp-opp-lost-001';
const OPP_LOST_FILTER_STAGE_ID = 'filt-opp-lost-stage-001';
const OPP_LOST_FILTER_PREV_ID = 'filt-opp-lost-prev-001';
const OPP_LOST_BRANCH_MATCH_ID = 'br-opp-lost-match-001';
const OPP_LOST_BRANCH_SKIP_ID = 'br-opp-lost-skip-001';

// Step/filter UUIDs for Workflow 12: Candidate Assigned
const CAND_ASSIGNED_IF_ID = 'step-cand-assigned-if-001';
const CAND_ASSIGNED_NOTIFY_ID = 'step-cand-assigned-notify-001';
const CAND_ASSIGNED_FILTER_GROUP_ID = 'fgrp-cand-assigned-001';
const CAND_ASSIGNED_FILTER_ID = 'filt-cand-assigned-001';
const CAND_ASSIGNED_BRANCH_MATCH_ID = 'br-cand-assigned-match-001';
const CAND_ASSIGNED_BRANCH_SKIP_ID = 'br-cand-assigned-skip-001';

// Step/filter UUIDs for Workflow 13: Candidate Hired
const CAND_HIRED_IF_ID = 'step-cand-hired-if-001';
const CAND_HIRED_NOTIFY_ID = 'step-cand-hired-notify-001';
const CAND_HIRED_FILTER_GROUP_ID = 'fgrp-cand-hired-001';
const CAND_HIRED_FILTER_ID = 'filt-cand-hired-001';
const CAND_HIRED_BRANCH_MATCH_ID = 'br-cand-hired-match-001';
const CAND_HIRED_BRANCH_SKIP_ID = 'br-cand-hired-skip-001';

// Step IDs for Workflow 14 & 15
const CAND_FOLLOWUP_CHECK_ID = 'step-cand-followup-check-001';
const STALE_LEADS_CHECK_ID = 'step-stale-leads-check-001';

// Step IDs — stable across deploys
const LEAD_ASSIGNMENT_STEP_ASSIGN = 'step-assign-lead-001';
const LEAD_ASSIGNMENT_STEP_NOTIFY = 'step-notify-lead-001';

const SLA_STEP_UPDATE = 'step-update-sla-001';
const SLA_STEP_DELAY = 'step-delay-sla-001';
const SLA_STEP_NOTIFY = 'step-notify-sla-001';

const SUB_STEP_FIND = 'step-find-subscriptions-001';
const SUB_STEP_CREATE_TASK = 'step-create-sub-task-001';

const DOCTOR_CONV_STEP_IF = 'step-conv-if-001';
const DOCTOR_CONV_STEP_NOTIFY = 'step-conv-notify-001';

// UUIDs for the doctor-conversion IF_ELSE branches/filters (new format)
const DOCTOR_CONV_FILTER_GROUP_ID = 'f0a1b2c3-d4e5-6789-bcde-123456789012';
const DOCTOR_CONV_FILTER_STATUS_ID = 'a1b2c3d4-e5f6-7890-bcde-234567890123';
const DOCTOR_CONV_FILTER_PREV_STATUS_ID = 'b1c2d3e4-f5a6-7890-bcde-345678901234';
const DOCTOR_CONV_BRANCH_MATCH_ID = 'c1d2e3f4-a5b6-7890-bcde-456789012345';
const DOCTOR_CONV_BRANCH_SKIP_ID = 'd1e2f3a4-b5c6-7890-bcde-567890123456';

const makeActorFields = () => ({
  createdBySource: FieldActorSource.SYSTEM,
  createdByWorkspaceMemberId: null,
  createdByName: 'IDDA CRM',
  createdByContext: {},
  updatedBySource: FieldActorSource.SYSTEM,
  updatedByWorkspaceMemberId: null,
  updatedByName: 'IDDA CRM',
});

const makeErrorHandling = () => ({
  retryOnFailure: { value: false },
  continueOnFailure: { value: false },
});

export const prefillIddaWorkflows = async (
  entityManager: EntityManager,
  workspaceId: string,
  schemaName: string,
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>,
  _flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>,
): Promise<void> => {
  const { idByNameSingular } = buildObjectIdByNameMaps(flatObjectMetadataMaps);

  const leadObjectMetadataId = idByNameSingular['lead'];
  const subscriptionObjectMetadataId = idByNameSingular['subscription'];

  if (!isDefined(leadObjectMetadataId)) {
    // Lead object not yet in workspace metadata — IDDA workflows will be seeded without lead object ID validation.
    // This can happen if the workspace cache was populated before Lead was synchronized.
  }

  await entityManager
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.workflow`, [
      'id',
      'name',
      'lastPublishedVersionId',
      'statuses',
      'position',
      'createdBySource',
      'createdByWorkspaceMemberId',
      'createdByName',
      'createdByContext',
      'updatedBySource',
      'updatedByWorkspaceMemberId',
      'updatedByName',
    ])
    .orIgnore()
    .values([
      {
        id: IDDA_LEAD_ASSIGNMENT_WORKFLOW_ID,
        name: 'Lead Assignment Automation',
        lastPublishedVersionId: IDDA_LEAD_ASSIGNMENT_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 10,
        ...makeActorFields(),
      },
      {
        id: IDDA_SLA_ENFORCEMENT_WORKFLOW_ID,
        name: 'Lead SLA Enforcement',
        lastPublishedVersionId: IDDA_SLA_ENFORCEMENT_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 11,
        ...makeActorFields(),
      },
      ...(isDefined(subscriptionObjectMetadataId)
        ? [
            {
              id: IDDA_SUBSCRIPTION_RENEWAL_WORKFLOW_ID,
              name: 'Subscription Renewal Reminder',
              lastPublishedVersionId:
                IDDA_SUBSCRIPTION_RENEWAL_WORKFLOW_VERSION_ID,
              statuses: ['ACTIVE'],
              position: 12,
              ...makeActorFields(),
            },
          ]
        : []),
      {
        id: IDDA_LEAD_DOCTOR_CONVERSION_WORKFLOW_ID,
        name: 'Lead Converted — Create Doctor',
        lastPublishedVersionId: IDDA_LEAD_DOCTOR_CONVERSION_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 13,
        ...makeActorFields(),
      },
      {
        id: IDDA_LEAD_NEXT_STEP_WORKFLOW_ID,
        name: 'Lead Must Have a Next Step',
        lastPublishedVersionId: IDDA_LEAD_NEXT_STEP_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 14,
        ...makeActorFields(),
      },
      {
        id: IDDA_FIRST_CONTACT_SLA_WORKFLOW_ID,
        name: 'First Contact SLA',
        lastPublishedVersionId: IDDA_FIRST_CONTACT_SLA_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 15,
        ...makeActorFields(),
      },
      {
        id: IDDA_MISSED_FOLLOWUP_WORKFLOW_ID,
        name: 'Missed Follow-Up Alert',
        lastPublishedVersionId: IDDA_MISSED_FOLLOWUP_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 16,
        ...makeActorFields(),
      },
      {
        id: IDDA_OPP_WON_WORKFLOW_ID,
        name: 'Opportunity Won → Subscription & Handoff',
        lastPublishedVersionId: IDDA_OPP_WON_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 17,
        ...makeActorFields(),
      },
      {
        id: IDDA_TASK_EMAIL_WORKFLOW_ID,
        name: 'Task Assigned → Email Notification',
        lastPublishedVersionId: IDDA_TASK_EMAIL_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 18,
        ...makeActorFields(),
      },
      {
        id: IDDA_HIGH_PRIORITY_LEAD_WORKFLOW_ID,
        name: 'High-Priority Lead → Manager Alert',
        lastPublishedVersionId: IDDA_HIGH_PRIORITY_LEAD_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 19,
        ...makeActorFields(),
      },
      {
        id: IDDA_OPP_LOST_WORKFLOW_ID,
        name: 'Opportunity Lost → Debrief Notification',
        lastPublishedVersionId: IDDA_OPP_LOST_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 20,
        ...makeActorFields(),
      },
      {
        id: IDDA_CANDIDATE_ASSIGNED_WORKFLOW_ID,
        name: 'Candidate Assigned → Recruiter Alert',
        lastPublishedVersionId: IDDA_CANDIDATE_ASSIGNED_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 21,
        ...makeActorFields(),
      },
      {
        id: IDDA_CANDIDATE_HIRED_WORKFLOW_ID,
        name: 'Candidate Hired → Onboarding Notification',
        lastPublishedVersionId: IDDA_CANDIDATE_HIRED_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 22,
        ...makeActorFields(),
      },
      {
        id: IDDA_CANDIDATE_FOLLOWUP_WORKFLOW_ID,
        name: 'Candidate Follow-Up Reminder',
        lastPublishedVersionId: IDDA_CANDIDATE_FOLLOWUP_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 23,
        ...makeActorFields(),
      },
      {
        id: IDDA_STALE_LEADS_WORKFLOW_ID,
        name: 'Stale Lead Weekly Alert',
        lastPublishedVersionId: IDDA_STALE_LEADS_WORKFLOW_VERSION_ID,
        statuses: ['ACTIVE'],
        position: 24,
        ...makeActorFields(),
      },
    ])
    .returning('*')
    .execute();

  // ── Workflow versions ─────────────────────────────────────────────────────

  const versionValues: object[] = [
    {
      id: IDDA_LEAD_ASSIGNMENT_WORKFLOW_VERSION_ID,
      name: 'v1',
      status: 'ACTIVE',
      position: 1,
      workflowId: IDDA_LEAD_ASSIGNMENT_WORKFLOW_ID,
      trigger: JSON.stringify({
        name: 'Lead is created',
        type: 'DATABASE_EVENT',
        settings: {
          eventName: 'lead.created',
          outputSchema: {},
        },
        nextStepIds: [LEAD_ASSIGNMENT_STEP_ASSIGN],
      }),
      steps: JSON.stringify([
        {
          id: LEAD_ASSIGNMENT_STEP_ASSIGN,
          name: 'Assign Lead',
          type: 'IDDA_ASSIGN_LEAD',
          valid: true,
          settings: {
            notifyAssignee: false,
            outputSchema: {
              leadId: { type: 'string', label: 'Lead ID', isLeaf: true },
              assignedTo: { type: 'string', label: 'Assigned To', isLeaf: true },
              notificationSent: { type: 'boolean', label: 'Notification Sent', isLeaf: true },
            },
            errorHandlingOptions: makeErrorHandling(),
            input: {
              leadId: '{{trigger.properties.after.id}}',
              assigneeWorkspaceMemberId:
                '{{trigger.properties.after.assigneeId}}',
              notifyAssignee: false,
              notificationTitle: 'New lead assigned to you',
              notificationBody:
                'A new lead has been assigned to you. Please follow up promptly.',
            },
          },
          __typename: 'WorkflowAction',
          nextStepIds: [LEAD_ASSIGNMENT_STEP_NOTIFY],
        },
        {
          id: LEAD_ASSIGNMENT_STEP_NOTIFY,
          name: 'Notify Sales Manager',
          type: 'IDDA_NOTIFY',
          valid: true,
          settings: {
            channel: 'IN_APP',
            notificationType: 'LEAD_ASSIGNED',
            outputSchema: {
              notificationQueued: { type: 'boolean', label: 'Notification Queued', isLeaf: true },
              recipientWorkspaceMemberId: { type: 'string', label: 'Recipient ID', isLeaf: true },
            },
            errorHandlingOptions: makeErrorHandling(),
            input: {
              recipientWorkspaceMemberId:
                '{{trigger.properties.after.assigneeId}}',
              title: 'Lead assigned: {{trigger.properties.after.name}}',
              body: 'You have been assigned a new lead. Priority: {{trigger.properties.after.priority}}.',
              channel: 'IN_APP',
              notificationType: 'LEAD_ASSIGNED',
              relatedRecordId: '{{trigger.properties.after.id}}',
            },
          },
          __typename: 'WorkflowAction',
          nextStepIds: null,
        },
      ]),
    },

    {
      id: IDDA_SLA_ENFORCEMENT_WORKFLOW_VERSION_ID,
      name: 'v1',
      status: 'ACTIVE',
      position: 1,
      workflowId: IDDA_SLA_ENFORCEMENT_WORKFLOW_ID,
      trigger: JSON.stringify({
        name: 'Lead status changed to Qualified',
        type: 'DATABASE_EVENT',
        settings: {
          eventName: 'lead.updated',
          fields: ['status'],
          outputSchema: {},
        },
        nextStepIds: [SLA_STEP_UPDATE],
      }),
      steps: JSON.stringify([
        {
          id: SLA_STEP_UPDATE,
          name: 'Set SLA Deadline',
          type: 'IDDA_UPDATE_SLA',
          valid: true,
          settings: {
            defaultSlaHours: 24,
            useBusinessCalendar: true,
            priorityConfig: [
              { priority: 'URGENT', slaHours: 4 },
              { priority: 'HIGH', slaHours: 8 },
              { priority: 'NORMAL', slaHours: 24 },
              { priority: 'LOW', slaHours: 72 },
            ],
            outputSchema: {
              recordId: { type: 'string', label: 'Record ID', isLeaf: true },
              slaDeadline: { type: 'string', label: 'SLA Deadline', isLeaf: true },
            },
            errorHandlingOptions: makeErrorHandling(),
            input: {
              recordId: '{{trigger.properties.after.id}}',
              objectSingularName: 'lead',
              slaFieldName: 'slaDeadline',
              useBusinessCalendar: true,
              priority: 'NORMAL',
            },
          },
          __typename: 'WorkflowAction',
          nextStepIds: [SLA_STEP_DELAY],
        },
        {
          id: SLA_STEP_DELAY,
          name: 'Wait 1 Business Day',
          type: 'DELAY',
          valid: true,
          settings: {
            outputSchema: {},
            errorHandlingOptions: makeErrorHandling(),
            input: {
              delayType: 'BUSINESS_DAYS',
              businessDays: 1,
            },
          },
          __typename: 'WorkflowAction',
          nextStepIds: [SLA_STEP_NOTIFY],
        },
        {
          id: SLA_STEP_NOTIFY,
          name: 'SLA Warning Notification',
          type: 'IDDA_NOTIFY',
          valid: true,
          settings: {
            channel: 'BOTH',
            notificationType: 'SLA_WARNING',
            outputSchema: {
              notificationQueued: { type: 'boolean', label: 'Notification Queued', isLeaf: true },
            },
            errorHandlingOptions: makeErrorHandling(),
            input: {
              recipientWorkspaceMemberId:
                '{{trigger.properties.after.assigneeId}}',
              title: 'SLA Warning: Lead approaching deadline',
              body: 'The lead "{{trigger.properties.after.name}}" is approaching its SLA deadline. Please take action.',
              channel: 'BOTH',
              notificationType: 'SLA_WARNING',
              relatedRecordId: '{{trigger.properties.after.id}}',
            },
          },
          __typename: 'WorkflowAction',
          nextStepIds: null,
        },
      ]),
    },
  ];

  versionValues.push({
    id: IDDA_LEAD_DOCTOR_CONVERSION_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_LEAD_DOCTOR_CONVERSION_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Lead status updated',
      type: 'DATABASE_EVENT',
      settings: {
        eventName: 'lead.updated',
        outputSchema: {},
      },
      nextStepIds: [DOCTOR_CONV_STEP_IF],
    }),
    steps: JSON.stringify([
      {
        id: DOCTOR_CONV_STEP_IF,
        name: 'Check if status changed to Converted',
        type: 'IF_ELSE',
        valid: true,
        settings: {
          outputSchema: {
            matchingBranchId: {
              type: 'string',
              label: 'Matching Branch ID',
              isLeaf: true,
            },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            stepFilterGroups: [
              {
                id: DOCTOR_CONV_FILTER_GROUP_ID,
                logicalOperator: 'AND',
              },
            ],
            stepFilters: [
              {
                id: DOCTOR_CONV_FILTER_STATUS_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.after.status',
                operand: 'IS',
                value: '"CONVERTED"',
                stepFilterGroupId: DOCTOR_CONV_FILTER_GROUP_ID,
                positionInStepFilterGroup: 0,
              },
              {
                id: DOCTOR_CONV_FILTER_PREV_STATUS_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.before.status',
                operand: 'IS_NOT',
                value: '"CONVERTED"',
                stepFilterGroupId: DOCTOR_CONV_FILTER_GROUP_ID,
                positionInStepFilterGroup: 1,
              },
            ],
            branches: [
              {
                id: DOCTOR_CONV_BRANCH_MATCH_ID,
                filterGroupId: DOCTOR_CONV_FILTER_GROUP_ID,
                nextStepIds: [DOCTOR_CONV_STEP_NOTIFY],
              },
              {
                id: DOCTOR_CONV_BRANCH_SKIP_ID,
                nextStepIds: [],
              },
            ],
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [DOCTOR_CONV_STEP_NOTIFY],
      },
      {
        id: DOCTOR_CONV_STEP_NOTIFY,
        name: 'Notify: Lead Converted',
        type: 'IDDA_NOTIFY',
        valid: true,
        settings: {
          channel: 'IN_APP',
          notificationType: 'LEAD_CONVERTED',
          outputSchema: {
            notificationQueued: {
              type: 'boolean',
              label: 'Notification Queued',
              isLeaf: true,
            },
          },
          // continueOnFailure=true so that an unassigned lead does not fail
          // the entire workflow run — the Doctor was already linked by the
          // backend hook which ran synchronously before this workflow step.
          errorHandlingOptions: {
            retryOnFailure: { value: false },
            continueOnFailure: { value: true },
          },
          input: {
            recipientWorkspaceMemberId:
              '{{trigger.properties.after.assignedToId}}',
            title: 'Lead converted: {{trigger.properties.after.doctorName}}',
            body: 'Lead "{{trigger.properties.after.doctorName}}" at {{trigger.properties.after.clinicName}} has been converted. Please verify the Doctor record in the system.',
            channel: 'IN_APP',
            notificationType: 'LEAD_CONVERTED',
            relatedRecordId: '{{trigger.properties.after.id}}',
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 5: Lead Must Have a Next Step ───────────────────────────────────
  versionValues.push({
    id: IDDA_LEAD_NEXT_STEP_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_LEAD_NEXT_STEP_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Lead status updated',
      type: 'DATABASE_EVENT',
      settings: {
        eventName: 'lead.updated',
        fields: ['status'],
        outputSchema: {},
      },
      nextStepIds: [NEXT_STEP_STATUS_IF_ID],
    }),
    steps: JSON.stringify([
      {
        id: NEXT_STEP_STATUS_IF_ID,
        name: 'Is status an active stage?',
        type: 'IF_ELSE',
        valid: true,
        settings: {
          outputSchema: {
            matchingBranchId: {
              type: 'string',
              label: 'Matching Branch ID',
              isLeaf: true,
            },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            stepFilterGroups: [
              {
                id: NEXT_STEP_FILTER_GROUP_ID,
                logicalOperator: 'AND',
              },
            ],
            stepFilters: [
              {
                id: NEXT_STEP_FILTER_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.after.status',
                operand: 'IS',
                value: '["CONTACTED","INTERESTED"]',
                stepFilterGroupId: NEXT_STEP_FILTER_GROUP_ID,
                positionInStepFilterGroup: 0,
              },
            ],
            branches: [
              {
                id: NEXT_STEP_BRANCH_ACTIVE_ID,
                filterGroupId: NEXT_STEP_FILTER_GROUP_ID,
                nextStepIds: [NEXT_STEP_CHECK_ID],
              },
              {
                id: NEXT_STEP_BRANCH_SKIP_ID,
                nextStepIds: [],
              },
            ],
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [NEXT_STEP_CHECK_ID],
      },
      {
        id: NEXT_STEP_CHECK_ID,
        name: 'Check and warn: no next step',
        type: 'IDDA_CHECK_LEAD_NEXT_STEP',
        valid: true,
        settings: {
          outputSchema: {
            warningIssued: {
              type: 'boolean',
              label: 'Warning Issued',
              isLeaf: true,
            },
            reason: {
              type: 'string',
              label: 'Reason',
              isLeaf: true,
            },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            leadId: '{{trigger.properties.after.id}}',
            assignedToId: '{{trigger.properties.after.assignedToId}}',
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 6: First Contact SLA ────────────────────────────────────────────
  // Fires when a lead becomes ASSIGNED, waits 1 business day, then checks
  // whether the rep has made contact. If still ASSIGNED, sends SLA_BREACH
  // notification and writes a dedup-guarded timeline event.
  versionValues.push({
    id: IDDA_FIRST_CONTACT_SLA_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_FIRST_CONTACT_SLA_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Lead status updated',
      type: 'DATABASE_EVENT',
      settings: {
        eventName: 'lead.updated',
        fields: ['status'],
        outputSchema: {},
      },
      nextStepIds: [FCS_STATUS_IF_ID],
    }),
    steps: JSON.stringify([
      {
        id: FCS_STATUS_IF_ID,
        name: 'Is status now ASSIGNED?',
        type: 'IF_ELSE',
        valid: true,
        settings: {
          outputSchema: {
            matchingBranchId: {
              type: 'string',
              label: 'Matching Branch ID',
              isLeaf: true,
            },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            stepFilterGroups: [
              {
                id: FCS_FILTER_GROUP_ID,
                logicalOperator: 'AND',
              },
            ],
            stepFilters: [
              {
                id: FCS_FILTER_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.after.status',
                operand: 'IS',
                value: '"ASSIGNED"',
                stepFilterGroupId: FCS_FILTER_GROUP_ID,
                positionInStepFilterGroup: 0,
              },
            ],
            branches: [
              {
                id: FCS_BRANCH_ASSIGNED_ID,
                filterGroupId: FCS_FILTER_GROUP_ID,
                nextStepIds: [FCS_DELAY_ID],
              },
              {
                id: FCS_BRANCH_SKIP_ID,
                nextStepIds: [],
              },
            ],
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [FCS_DELAY_ID],
      },
      {
        id: FCS_DELAY_ID,
        name: 'Wait 1 business day',
        type: 'DELAY',
        valid: true,
        settings: {
          outputSchema: {},
          errorHandlingOptions: makeErrorHandling(),
          input: {
            delayType: 'BUSINESS_DAYS',
            businessDays: 1,
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [FCS_CHECK_ID],
      },
      {
        id: FCS_CHECK_ID,
        name: 'Check first-contact SLA',
        type: 'IDDA_CHECK_FIRST_CONTACT_SLA',
        valid: true,
        settings: {
          outputSchema: {
            breached: {
              type: 'boolean',
              label: 'SLA Breached',
              isLeaf: true,
            },
            outcome: {
              type: 'string',
              label: 'Outcome',
              isLeaf: true,
            },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            leadId: '{{trigger.properties.after.id}}',
            assignedToId: '{{trigger.properties.after.assignedToId}}',
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 7: Missed Follow-Up Alert (CRON daily at 09:00 UTC) ─────────────
  // Scans all leads with an overdue nextFollowUpDate in an active stage.
  // Deduplication is handled inside the action (one warning per lead per day).
  versionValues.push({
    id: IDDA_MISSED_FOLLOWUP_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_MISSED_FOLLOWUP_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Daily missed follow-up scan',
      type: 'CRON',
      settings: {
        schedule: { type: 'DAYS', value: '1', hoursUTC: 9, minutesUTC: 0 },
        outputSchema: {},
      },
      nextStepIds: [MISSED_FU_CHECK_ID],
    }),
    steps: JSON.stringify([
      {
        id: MISSED_FU_CHECK_ID,
        name: 'Find and warn missed follow-ups',
        type: 'IDDA_CHECK_MISSED_FOLLOWUPS',
        valid: true,
        settings: {
          outputSchema: {
            totalChecked: {
              type: 'number',
              label: 'Total Checked',
              isLeaf: true,
            },
            totalWarned: {
              type: 'number',
              label: 'Total Warned',
              isLeaf: true,
            },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            activeStatuses: ['CONTACTED', 'INTERESTED', 'ASSIGNED'],
            limitPerRun: 100,
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 8: Opportunity Won → Subscription & Handoff ─────────────────────
  // Triggers when Opportunity.stage changes to WON from a non-WON value.
  // Creates a Subscription (PENDING_ONBOARDING) and 5 onboarding tasks, then
  // notifies the Sales Executive and Operations owner. Idempotent: if a
  // Subscription already exists for this Opportunity, it skips creation.
  versionValues.push({
    id: IDDA_OPP_WON_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_OPP_WON_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Opportunity stage updated',
      type: 'DATABASE_EVENT',
      settings: {
        eventName: 'opportunity.updated',
        fields: ['stage'],
        outputSchema: {},
      },
      nextStepIds: [OPP_WON_STATUS_IF_ID],
    }),
    steps: JSON.stringify([
      {
        id: OPP_WON_STATUS_IF_ID,
        name: 'Did stage change to WON?',
        type: 'IF_ELSE',
        valid: true,
        settings: {
          outputSchema: {
            matchingBranchId: {
              type: 'string',
              label: 'Matching Branch ID',
              isLeaf: true,
            },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            stepFilterGroups: [
              {
                id: OPP_WON_FILTER_GROUP_ID,
                logicalOperator: 'AND',
              },
            ],
            stepFilters: [
              {
                id: OPP_WON_FILTER_STAGE_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.after.stage',
                operand: 'IS',
                value: '"WON"',
                stepFilterGroupId: OPP_WON_FILTER_GROUP_ID,
                positionInStepFilterGroup: 0,
              },
              {
                id: OPP_WON_FILTER_PREV_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.before.stage',
                operand: 'IS_NOT',
                value: '"WON"',
                stepFilterGroupId: OPP_WON_FILTER_GROUP_ID,
                positionInStepFilterGroup: 1,
              },
            ],
            branches: [
              {
                id: OPP_WON_BRANCH_MATCH_ID,
                filterGroupId: OPP_WON_FILTER_GROUP_ID,
                nextStepIds: [OPP_WON_HANDLE_ID],
              },
              {
                id: OPP_WON_BRANCH_SKIP_ID,
                nextStepIds: [],
              },
            ],
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [OPP_WON_HANDLE_ID],
      },
      {
        id: OPP_WON_HANDLE_ID,
        name: 'Create subscription and handoff',
        type: 'IDDA_HANDLE_OPP_WON',
        valid: true,
        settings: {
          outputSchema: {
            outcome: {
              type: 'string',
              label: 'Outcome',
              isLeaf: true,
            },
            subscriptionId: {
              type: 'string',
              label: 'Subscription ID',
              isLeaf: true,
            },
            tasksCreated: {
              type: 'number',
              label: 'Tasks Created',
              isLeaf: true,
            },
          },
          // continueOnFailure=true so a failed handoff does not block the
          // workflow run log — the Opportunity stage change itself succeeded.
          errorHandlingOptions: {
            retryOnFailure: { value: true },
            continueOnFailure: { value: false },
          },
          input: {
            opportunityId: '{{trigger.properties.after.id}}',
            // operationsOwnerId is optional — falls back to Opportunity owner.
            operationsOwnerId: null,
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  if (isDefined(subscriptionObjectMetadataId)) {
    versionValues.push({
      id: IDDA_SUBSCRIPTION_RENEWAL_WORKFLOW_VERSION_ID,
      name: 'v1',
      status: 'ACTIVE',
      position: 1,
      workflowId: IDDA_SUBSCRIPTION_RENEWAL_WORKFLOW_ID,
      trigger: JSON.stringify({
        name: 'Monthly renewal check',
        type: 'CRON',
        settings: {
          schedule: { type: 'DAYS', value: '1', hoursUTC: 8, minutesUTC: 0 },
          outputSchema: {},
        },
        nextStepIds: [SUB_STEP_FIND],
      }),
      steps: JSON.stringify([
        {
          id: SUB_STEP_FIND,
          name: 'Find Subscriptions Due Soon',
          type: 'FIND_RECORDS',
          valid: true,
          settings: {
            outputSchema: {},
            errorHandlingOptions: makeErrorHandling(),
            input: {
              objectName: 'subscription',
              limit: 50,
              filter: {
                recordFilters: [],
                recordFilterGroups: [],
              },
            },
          },
          __typename: 'WorkflowAction',
          nextStepIds: [SUB_STEP_CREATE_TASK],
        },
        {
          id: SUB_STEP_CREATE_TASK,
          name: 'Create Renewal Task',
          type: 'IDDA_CREATE_SUBSCRIPTION_TASK',
          valid: true,
          settings: {
            defaultDueDaysBeforeRenewal: 7,
            notifyAssignee: true,
            outputSchema: {
              taskId: { type: 'string', label: 'Task ID', isLeaf: true },
              subscriptionId: { type: 'string', label: 'Subscription ID', isLeaf: true },
              dueAt: { type: 'string', label: 'Due At', isLeaf: true },
            },
            errorHandlingOptions: makeErrorHandling(),
            input: {
              subscriptionId: '{{trigger.properties.after.id}}',
              renewalDate: '{{trigger.properties.after.renewalDate}}',
              assigneeWorkspaceMemberId:
                '{{trigger.properties.after.assigneeId}}',
              taskTitle:
                'Renewal due: {{trigger.properties.after.name}}',
              taskBody:
                'Subscription "{{trigger.properties.after.name}}" renews on {{trigger.properties.after.renewalDate}}. Please review and contact the clinic.',
              dueDaysBeforeRenewal: 7,
            },
          },
          __typename: 'WorkflowAction',
          nextStepIds: null,
        },
      ]),
    });
  }

  // Workflow 9: Task Assignment Email
  versionValues.push({
    id: IDDA_TASK_EMAIL_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_TASK_EMAIL_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Task is assigned',
      type: 'DATABASE_EVENT',
      settings: {
        eventName: 'task.updated',
        fields: ['assigneeId'],
        outputSchema: {},
      },
      nextStepIds: [TASK_EMAIL_STEP_SEND],
    }),
    steps: JSON.stringify([
      {
        id: TASK_EMAIL_STEP_SEND,
        name: 'Send Task Assignment Email',
        type: 'IDDA_SEND_TASK_EMAIL',
        valid: true,
        settings: {
          outputSchema: {
            emailSent: { type: 'boolean', label: 'Email Sent', isLeaf: true },
            recipientEmail: { type: 'string', label: 'Recipient Email', isLeaf: true },
            taskId: { type: 'string', label: 'Task ID', isLeaf: true },
            taskTitle: { type: 'string', label: 'Task Title', isLeaf: true },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            taskId: '{{trigger.properties.after.id}}',
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 10: High-Priority Lead → Manager Alert ────────────────────────────
  versionValues.push({
    id: IDDA_HIGH_PRIORITY_LEAD_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_HIGH_PRIORITY_LEAD_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Lead is created',
      type: 'DATABASE_EVENT',
      settings: { eventName: 'lead.created', outputSchema: {} },
      nextStepIds: [HP_LEAD_IF_ID],
    }),
    steps: JSON.stringify([
      {
        id: HP_LEAD_IF_ID,
        name: 'Is priority URGENT?',
        type: 'IF_ELSE',
        valid: true,
        settings: {
          outputSchema: { matchingBranchId: { type: 'string', label: 'Matching Branch ID', isLeaf: true } },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            stepFilterGroups: [{ id: HP_LEAD_FILTER_GROUP_ID, logicalOperator: 'AND' }],
            stepFilters: [
              {
                id: HP_LEAD_FILTER_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.after.priority',
                operand: 'IS',
                value: '"URGENT"',
                stepFilterGroupId: HP_LEAD_FILTER_GROUP_ID,
                positionInStepFilterGroup: 0,
              },
            ],
            branches: [
              { id: HP_LEAD_BRANCH_MATCH_ID, filterGroupId: HP_LEAD_FILTER_GROUP_ID, nextStepIds: [HP_LEAD_NOTIFY_ID] },
              { id: HP_LEAD_BRANCH_SKIP_ID, nextStepIds: [] },
            ],
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [HP_LEAD_NOTIFY_ID],
      },
      {
        id: HP_LEAD_NOTIFY_ID,
        name: 'Alert manager: urgent lead',
        type: 'IDDA_NOTIFY',
        valid: true,
        settings: {
          channel: 'BOTH',
          notificationType: 'LEAD_ASSIGNED',
          outputSchema: { notificationQueued: { type: 'boolean', label: 'Notification Queued', isLeaf: true } },
          errorHandlingOptions: { retryOnFailure: { value: false }, continueOnFailure: { value: true } },
          input: {
            recipientWorkspaceMemberId: '{{trigger.properties.after.assigneeId}}',
            title: '🚨 URGENT lead created: {{trigger.properties.after.clinicName}}',
            body: 'A new URGENT priority lead "{{trigger.properties.after.clinicName}}" has been created. Immediate follow-up required.',
            channel: 'BOTH',
            notificationType: 'LEAD_ASSIGNED',
            relatedRecordId: '{{trigger.properties.after.id}}',
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 11: Opportunity Lost → Debrief Notification ────────────────────────
  versionValues.push({
    id: IDDA_OPP_LOST_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_OPP_LOST_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Opportunity stage updated',
      type: 'DATABASE_EVENT',
      settings: { eventName: 'opportunity.updated', fields: ['stage'], outputSchema: {} },
      nextStepIds: [OPP_LOST_IF_ID],
    }),
    steps: JSON.stringify([
      {
        id: OPP_LOST_IF_ID,
        name: 'Did stage change to LOST?',
        type: 'IF_ELSE',
        valid: true,
        settings: {
          outputSchema: { matchingBranchId: { type: 'string', label: 'Matching Branch ID', isLeaf: true } },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            stepFilterGroups: [{ id: OPP_LOST_FILTER_GROUP_ID, logicalOperator: 'AND' }],
            stepFilters: [
              {
                id: OPP_LOST_FILTER_STAGE_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.after.stage',
                operand: 'IS',
                value: '"LOST"',
                stepFilterGroupId: OPP_LOST_FILTER_GROUP_ID,
                positionInStepFilterGroup: 0,
              },
              {
                id: OPP_LOST_FILTER_PREV_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.before.stage',
                operand: 'IS_NOT',
                value: '"LOST"',
                stepFilterGroupId: OPP_LOST_FILTER_GROUP_ID,
                positionInStepFilterGroup: 1,
              },
            ],
            branches: [
              { id: OPP_LOST_BRANCH_MATCH_ID, filterGroupId: OPP_LOST_FILTER_GROUP_ID, nextStepIds: [OPP_LOST_NOTIFY_ID] },
              { id: OPP_LOST_BRANCH_SKIP_ID, nextStepIds: [] },
            ],
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [OPP_LOST_NOTIFY_ID],
      },
      {
        id: OPP_LOST_NOTIFY_ID,
        name: 'Notify: opportunity lost',
        type: 'IDDA_NOTIFY',
        valid: true,
        settings: {
          channel: 'IN_APP',
          notificationType: 'WORKFLOW_ACTION',
          outputSchema: { notificationQueued: { type: 'boolean', label: 'Notification Queued', isLeaf: true } },
          errorHandlingOptions: { retryOnFailure: { value: false }, continueOnFailure: { value: true } },
          input: {
            recipientWorkspaceMemberId: '{{trigger.properties.after.pointOfContactId}}',
            title: 'Opportunity lost: {{trigger.properties.after.name}}',
            body: 'Deal "{{trigger.properties.after.name}}" has been marked as Lost. Please document the reason in notes for future analysis.',
            channel: 'IN_APP',
            notificationType: 'WORKFLOW_ACTION',
            relatedRecordId: '{{trigger.properties.after.id}}',
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 12: Candidate Assigned → Recruiter Alert ───────────────────────────
  versionValues.push({
    id: IDDA_CANDIDATE_ASSIGNED_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_CANDIDATE_ASSIGNED_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Candidate assignee updated',
      type: 'DATABASE_EVENT',
      settings: { eventName: 'candidate.updated', fields: ['assignedToId'], outputSchema: {} },
      nextStepIds: [CAND_ASSIGNED_IF_ID],
    }),
    steps: JSON.stringify([
      {
        id: CAND_ASSIGNED_IF_ID,
        name: 'Is a recruiter now assigned?',
        type: 'IF_ELSE',
        valid: true,
        settings: {
          outputSchema: { matchingBranchId: { type: 'string', label: 'Matching Branch ID', isLeaf: true } },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            stepFilterGroups: [{ id: CAND_ASSIGNED_FILTER_GROUP_ID, logicalOperator: 'AND' }],
            stepFilters: [
              {
                id: CAND_ASSIGNED_FILTER_ID,
                type: 'TEXT',
                stepOutputKey: 'trigger.properties.after.assignedToId',
                operand: 'IS_NOT_EMPTY',
                value: '',
                stepFilterGroupId: CAND_ASSIGNED_FILTER_GROUP_ID,
                positionInStepFilterGroup: 0,
              },
            ],
            branches: [
              { id: CAND_ASSIGNED_BRANCH_MATCH_ID, filterGroupId: CAND_ASSIGNED_FILTER_GROUP_ID, nextStepIds: [CAND_ASSIGNED_NOTIFY_ID] },
              { id: CAND_ASSIGNED_BRANCH_SKIP_ID, nextStepIds: [] },
            ],
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [CAND_ASSIGNED_NOTIFY_ID],
      },
      {
        id: CAND_ASSIGNED_NOTIFY_ID,
        name: 'Notify recruiter: candidate assigned',
        type: 'IDDA_NOTIFY',
        valid: true,
        settings: {
          channel: 'IN_APP',
          notificationType: 'LEAD_ASSIGNED',
          outputSchema: { notificationQueued: { type: 'boolean', label: 'Notification Queued', isLeaf: true } },
          errorHandlingOptions: { retryOnFailure: { value: false }, continueOnFailure: { value: true } },
          input: {
            recipientWorkspaceMemberId: '{{trigger.properties.after.assignedToId}}',
            title: 'Candidate assigned: {{trigger.properties.after.name}}',
            body: 'Candidate "{{trigger.properties.after.name}}" has been assigned to you. Please review their profile and schedule a follow-up.',
            channel: 'IN_APP',
            notificationType: 'LEAD_ASSIGNED',
            relatedRecordId: '{{trigger.properties.after.id}}',
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 13: Candidate Hired → Onboarding Notification ─────────────────────
  versionValues.push({
    id: IDDA_CANDIDATE_HIRED_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_CANDIDATE_HIRED_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Candidate status updated',
      type: 'DATABASE_EVENT',
      settings: { eventName: 'candidate.updated', fields: ['status'], outputSchema: {} },
      nextStepIds: [CAND_HIRED_IF_ID],
    }),
    steps: JSON.stringify([
      {
        id: CAND_HIRED_IF_ID,
        name: 'Did status change to HIRED?',
        type: 'IF_ELSE',
        valid: true,
        settings: {
          outputSchema: { matchingBranchId: { type: 'string', label: 'Matching Branch ID', isLeaf: true } },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            stepFilterGroups: [{ id: CAND_HIRED_FILTER_GROUP_ID, logicalOperator: 'AND' }],
            stepFilters: [
              {
                id: CAND_HIRED_FILTER_ID,
                type: 'SELECT',
                stepOutputKey: 'trigger.properties.after.status',
                operand: 'IS',
                value: '"HIRED"',
                stepFilterGroupId: CAND_HIRED_FILTER_GROUP_ID,
                positionInStepFilterGroup: 0,
              },
            ],
            branches: [
              { id: CAND_HIRED_BRANCH_MATCH_ID, filterGroupId: CAND_HIRED_FILTER_GROUP_ID, nextStepIds: [CAND_HIRED_NOTIFY_ID] },
              { id: CAND_HIRED_BRANCH_SKIP_ID, nextStepIds: [] },
            ],
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: [CAND_HIRED_NOTIFY_ID],
      },
      {
        id: CAND_HIRED_NOTIFY_ID,
        name: 'Notify HR: candidate hired',
        type: 'IDDA_NOTIFY',
        valid: true,
        settings: {
          channel: 'BOTH',
          notificationType: 'WORKFLOW_ACTION',
          outputSchema: { notificationQueued: { type: 'boolean', label: 'Notification Queued', isLeaf: true } },
          errorHandlingOptions: { retryOnFailure: { value: false }, continueOnFailure: { value: true } },
          input: {
            recipientWorkspaceMemberId: '{{trigger.properties.after.assignedToId}}',
            title: '🎉 Candidate hired: {{trigger.properties.after.name}}',
            body: 'Candidate "{{trigger.properties.after.name}}" has been marked as Hired. Please initiate the onboarding process.',
            channel: 'BOTH',
            notificationType: 'WORKFLOW_ACTION',
            relatedRecordId: '{{trigger.properties.after.id}}',
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 14: Candidate Follow-Up Reminder (CRON daily 09:30 UTC) ───────────
  versionValues.push({
    id: IDDA_CANDIDATE_FOLLOWUP_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_CANDIDATE_FOLLOWUP_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Daily candidate follow-up scan',
      type: 'CRON',
      settings: { schedule: { type: 'DAYS', value: '1', hoursUTC: 9, minutesUTC: 30 }, outputSchema: {} },
      nextStepIds: [CAND_FOLLOWUP_CHECK_ID],
    }),
    steps: JSON.stringify([
      {
        id: CAND_FOLLOWUP_CHECK_ID,
        name: 'Find and warn missed candidate follow-ups',
        type: 'IDDA_CHECK_CANDIDATE_FOLLOWUPS',
        valid: true,
        settings: {
          outputSchema: {
            totalChecked: { type: 'number', label: 'Total Checked', isLeaf: true },
            totalWarned: { type: 'number', label: 'Total Warned', isLeaf: true },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            activeStatuses: ['SCREENING', 'INTERVIEWING', 'OFFER_SENT'],
            limitPerRun: 100,
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  // ── Workflow 15: Stale Lead Weekly Alert (CRON weekly Monday 08:00 UTC) ─────────
  versionValues.push({
    id: IDDA_STALE_LEADS_WORKFLOW_VERSION_ID,
    name: 'v1',
    status: 'ACTIVE',
    position: 1,
    workflowId: IDDA_STALE_LEADS_WORKFLOW_ID,
    trigger: JSON.stringify({
      name: 'Weekly stale lead scan',
      type: 'CRON',
      settings: { schedule: { type: 'WEEKS', value: '1', hoursUTC: 8, minutesUTC: 0 }, outputSchema: {} },
      nextStepIds: [STALE_LEADS_CHECK_ID],
    }),
    steps: JSON.stringify([
      {
        id: STALE_LEADS_CHECK_ID,
        name: 'Find and alert stale leads',
        type: 'IDDA_CHECK_STALE_LEADS',
        valid: true,
        settings: {
          outputSchema: {
            totalChecked: { type: 'number', label: 'Total Checked', isLeaf: true },
            totalAlerted: { type: 'number', label: 'Total Alerted', isLeaf: true },
            staleDaysThreshold: { type: 'number', label: 'Stale Days Threshold', isLeaf: true },
          },
          errorHandlingOptions: makeErrorHandling(),
          input: {
            staleDaysThreshold: 30,
            activeStatuses: ['NEW', 'ASSIGNED', 'CONTACTED', 'INTERESTED'],
            limitPerRun: 100,
          },
        },
        __typename: 'WorkflowAction',
        nextStepIds: null,
      },
    ]),
  });

  await entityManager
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.workflowVersion`, [
      'id',
      'name',
      'trigger',
      'steps',
      'status',
      'position',
      'workflowId',
    ])
    .orIgnore()
    .values(versionValues)
    .returning('*')
    .execute();

  // Register automated triggers for event-driven workflows.
  await entityManager
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.workflowAutomatedTrigger`, [
      'id',
      'workflowId',
      'type',
      'settings',
    ])
    .orIgnore()
    .values([
      {
        id: IDDA_AUTO_TRIGGER_LEAD_ASSIGNMENT_ID,
        workflowId: IDDA_LEAD_ASSIGNMENT_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'lead.created' },
      },
      {
        id: IDDA_AUTO_TRIGGER_SLA_ENFORCEMENT_ID,
        workflowId: IDDA_SLA_ENFORCEMENT_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'lead.updated', fields: ['status'] },
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-123456789012',
        workflowId: IDDA_LEAD_DOCTOR_CONVERSION_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'lead.updated' },
      },
      {
        id: IDDA_AUTO_TRIGGER_LEAD_NEXT_STEP_ID,
        workflowId: IDDA_LEAD_NEXT_STEP_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'lead.updated', fields: ['status'] },
      },
      {
        id: IDDA_AUTO_TRIGGER_FIRST_CONTACT_SLA_ID,
        workflowId: IDDA_FIRST_CONTACT_SLA_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'lead.updated', fields: ['status'] },
      },
      // Missed Follow-Up Alert: CRON daily at 09:00 UTC
      {
        id: IDDA_AUTO_TRIGGER_MISSED_FOLLOWUP_ID,
        workflowId: IDDA_MISSED_FOLLOWUP_WORKFLOW_ID,
        type: 'CRON',
        settings: { pattern: '0 9 * * *' },
      },
      {
        id: IDDA_AUTO_TRIGGER_OPP_WON_ID,
        workflowId: IDDA_OPP_WON_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'opportunity.updated', fields: ['stage'] },
      },
      {
        id: IDDA_AUTO_TRIGGER_TASK_EMAIL_ID,
        workflowId: IDDA_TASK_EMAIL_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'task.updated', fields: ['assigneeId'] },
      },
      // Workflow 10: High-Priority Lead Escalation
      {
        id: IDDA_AUTO_TRIGGER_HIGH_PRIORITY_LEAD_ID,
        workflowId: IDDA_HIGH_PRIORITY_LEAD_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'lead.created' },
      },
      // Workflow 11: Opportunity Lost
      {
        id: IDDA_AUTO_TRIGGER_OPP_LOST_ID,
        workflowId: IDDA_OPP_LOST_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'opportunity.updated', fields: ['stage'] },
      },
      // Workflow 12: Candidate Assigned
      {
        id: IDDA_AUTO_TRIGGER_CANDIDATE_ASSIGNED_ID,
        workflowId: IDDA_CANDIDATE_ASSIGNED_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'candidate.updated', fields: ['assignedToId'] },
      },
      // Workflow 13: Candidate Hired
      {
        id: IDDA_AUTO_TRIGGER_CANDIDATE_HIRED_ID,
        workflowId: IDDA_CANDIDATE_HIRED_WORKFLOW_ID,
        type: 'DATABASE_EVENT',
        settings: { eventName: 'candidate.updated', fields: ['status'] },
      },
      // Workflow 14: Candidate Follow-Up Reminder (daily 09:30 UTC)
      {
        id: IDDA_AUTO_TRIGGER_CANDIDATE_FOLLOWUP_ID,
        workflowId: IDDA_CANDIDATE_FOLLOWUP_WORKFLOW_ID,
        type: 'CRON',
        settings: { pattern: '30 9 * * *' },
      },
      // Workflow 15: Stale Lead Weekly Alert (weekly Monday 08:00 UTC)
      {
        id: IDDA_AUTO_TRIGGER_STALE_LEADS_ID,
        workflowId: IDDA_STALE_LEADS_WORKFLOW_ID,
        type: 'CRON',
        settings: { pattern: '0 8 * * 1' },
      },
      // Fix: subscription renewal also needs a CRON auto-trigger entry
      // to be picked up by the workflow-cron-trigger-cron.job.ts scheduler.
      ...(isDefined(subscriptionObjectMetadataId)
        ? [
            {
              id: IDDA_AUTO_TRIGGER_SUB_RENEWAL_CRON_ID,
              workflowId: IDDA_SUBSCRIPTION_RENEWAL_WORKFLOW_ID,
              type: 'CRON',
              settings: { pattern: '0 8 * * *' },
            },
          ]
        : []),
    ])
    .execute();
};
