export type WorkflowTimelineEventName =
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.step.completed'
  | 'workflow.step.failed'
  | 'workflow.step.waiting'
  | 'workflow.notification.sent'
  | 'workflow.lead.assigned'
  | 'workflow.lead.status_changed'
  | 'workflow.lead.next_step_missing'
  | 'workflow.lead.first_contact_sla_breach'
  | 'workflow.lead.missed_followup_warning'
  | 'workflow.lead.followup_reminder_scheduled'
  | 'workflow.lead.followup_reminder_rescheduled'
  | 'workflow.lead.followup_reminder_cancelled'
  | 'workflow.lead.followup_reminder_sent'
  | 'workflow.lead.followup_reminder_suppressed'
  | 'workflow.candidate.followup_reminder_scheduled'
  | 'workflow.candidate.followup_reminder_rescheduled'
  | 'workflow.candidate.followup_reminder_cancelled'
  | 'workflow.candidate.followup_reminder_sent'
  | 'workflow.candidate.followup_reminder_suppressed'
  | 'workflow.lead.converted'
  | 'workflow.lead.converted.doctor_linked'
  | 'workflow.opportunity.won'
  | 'workflow.opportunity.won.subscription_created'
  | 'workflow.opportunity.won.subscription_exists'
  | 'workflow.subscription.created'
  | 'workflow.subscription.renewed'
  | 'workflow.employee.exit_handoff_task_reassigned'
  | 'workflow.employee.exit_handoff_completed'
  | 'workflow.employee.exit_handoff_failed';

export type WorkflowTimelineEvent = {
  workspaceId: string;
  workspaceMemberId?: string;
  targetObjectSingularName: string;
  targetRecordId: string;
  eventName: WorkflowTimelineEventName;
  properties?: Record<string, unknown>;
  linkedRecordId?: string;
  linkedRecordCachedName?: string;
  linkedObjectMetadataId?: string;
};
