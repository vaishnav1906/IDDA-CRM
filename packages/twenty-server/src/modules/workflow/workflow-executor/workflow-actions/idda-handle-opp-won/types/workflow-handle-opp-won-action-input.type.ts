export type WorkflowHandleOppWonActionInput = {
  opportunityId: string;
  /** ID of the Operations workspace member who will own the subscription.
   * Falls back to the Opportunity owner (Sales Executive) if not provided. */
  operationsOwnerId?: string | null;
};
