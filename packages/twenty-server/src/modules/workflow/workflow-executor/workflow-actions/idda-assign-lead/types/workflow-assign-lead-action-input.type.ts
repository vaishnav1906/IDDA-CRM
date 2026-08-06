export type WorkflowAssignLeadActionInput = {
  leadId: string;
  assigneeWorkspaceMemberId: string;
  notifyAssignee?: boolean;
  notificationTitle?: string;
  notificationBody?: string;
};
