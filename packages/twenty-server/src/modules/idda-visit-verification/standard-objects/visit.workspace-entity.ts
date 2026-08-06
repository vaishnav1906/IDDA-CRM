import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export class VisitWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;

  // Relations
  clinic: EntityRelation<CompanyWorkspaceEntity> | null;
  clinicId: string | null;
  employee: EntityRelation<WorkspaceMemberWorkspaceEntity> | null;
  employeeId: string | null;

  // Core fields
  visitDate: Date;
  visitNotes: string | null;

  // GPS fields
  latitude: number | null;
  longitude: number | null;
  visitAddress: string | null;

  // Selfie fields
  selfie: string | null;
  selfieHash: string | null;
  selfieStatus: string | null;

  // GPS verification
  gpsAccuracy: number | null;
  distanceFromClinic: number | null;
  locationStatus: string | null;

  // Capture metadata
  liveCameraCapture: boolean;
  imageReused: boolean;

  // Verification results
  verificationScore: number | null;
  verificationStatus: string | null;
  reviewDecision: string | null;

  // Device / source
  deviceIdentifier: string | null;
  captureSource: string | null;

  // Clinic exterior photo
  clinicPhoto: string | null;

  // Agent selfie captured during check-in
  selfiePhoto: string | null;

  // Manager review
  reviewComment: string | null;
}
