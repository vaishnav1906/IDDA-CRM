import { type ActorMetadata, type CurrencyMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export class SubscriptionWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;

  // Subscription fields
  name: string | null;
  plan: string | null;
  status: string | null;
  startDate: Date | null;
  endDate: Date | null;
  renewalDate: Date | null;
  billingCycle: string | null;
  amount: CurrencyMetadata | null;
  paymentStatus: string | null;

  // Relations
  clinic: EntityRelation<CompanyWorkspaceEntity> | null;
  clinicId: string | null;
  doctor: EntityRelation<PersonWorkspaceEntity> | null;
  doctorId: string | null;
  assignedEmployee: EntityRelation<WorkspaceMemberWorkspaceEntity> | null;
  assignedEmployeeId: string | null;
}
