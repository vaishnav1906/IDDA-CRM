export type WorkflowSubscriptionTaskActionInput = {
  subscriptionId: string;
  renewalDate: string;
  assigneeWorkspaceMemberId: string;
  taskTitle?: string;
  taskBody?: string;
  dueDaysBeforeRenewal?: number;
};
