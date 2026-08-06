import { type FullNameMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';

export class TeamMemberWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;

  // Identity
  name: FullNameMetadata | null;
  workEmail: string | null;
  phone: string | null;

  // Role and department
  roleLabel: string | null;
  department: string | null;

  // Employment
  employmentStatus: string | null;
  employeeType: string | null;
  joiningDate: Date | null;
  location: string | null;

  // Cross-schema links (plain UUID strings — not TwentyORM RELATION fields).
  // Bidirectional relations are avoided to keep the sync service self-contained.
  workspaceMemberId: string | null;
  userId: string | null;

  // Reporting manager: stores the workspaceMemberId of the manager.
  // Stored as TEXT so no inverse relation is required on WorkspaceMember.
  reportingManager: string | null;

  // Sync metadata
  source: string | null;
  lastSyncedAt: Date | null;
}
