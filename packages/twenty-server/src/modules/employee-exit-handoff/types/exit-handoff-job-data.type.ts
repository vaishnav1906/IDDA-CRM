export type ExitHandoffJobData = {
  workspaceId: string;
  teamMemberId: string;
  /** The exit status value that triggered this handoff (e.g. 'RESIGNED'). */
  exitStatus: string;
  /** workspaceMemberId of the actor who changed the status, for audit. */
  actorWorkspaceMemberId: string | null;
};
