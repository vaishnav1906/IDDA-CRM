export type ExitHandoffResult =
  | { outcome: 'ALREADY_PROCESSED' }
  | { outcome: 'NO_WORKSPACE_MEMBER_FOR_EMPLOYEE' }
  | { outcome: 'NO_REPORTING_MANAGER' }
  | { outcome: 'NO_WORKSPACE_MEMBER_FOR_MANAGER' }
  | { outcome: 'MANAGER_INACTIVE' }
  | {
      outcome: 'COMPLETED';
      transferred: number;
      skipped: number;
      failed: number;
    }
  | {
      outcome: 'PARTIAL_FAILURE';
      transferred: number;
      skipped: number;
      failed: number;
    };
