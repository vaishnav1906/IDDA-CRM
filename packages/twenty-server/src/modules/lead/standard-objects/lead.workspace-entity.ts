import { type ActorMetadata, type LinksMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type AttachmentWorkspaceEntity } from 'src/modules/attachment/standard-objects/attachment.workspace-entity';
import { type CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { type NoteTargetWorkspaceEntity } from 'src/modules/note/standard-objects/note-target.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { type TaskTargetWorkspaceEntity } from 'src/modules/task/standard-objects/task-target.workspace-entity';
import { type TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export class LeadWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;

  // MedLeads import fields
  clinicName: string | null;
  doctorName: string | null;
  specialization: string | null;
  otherDoctors: string | null;
  phone: string | null;
  address: string | null;
  town: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  rating: number | null;
  reviews: number | null;
  website: LinksMetadata | null;
  mapsUrl: LinksMetadata | null;
  latitude: number | null;
  longitude: number | null;
  extractedAt: Date | null;

  // CRM-specific fields
  status: string | null;
  priority: string | null;
  source: string | null;
  importedAt: Date | null;

  // Relations
  clinic: EntityRelation<CompanyWorkspaceEntity> | null;
  clinicId: string | null;
  doctor: EntityRelation<PersonWorkspaceEntity> | null;
  doctorId: string | null;
  assignedTo: EntityRelation<WorkspaceMemberWorkspaceEntity> | null;
  assignedToId: string | null;
  taskTargets: EntityRelation<TaskTargetWorkspaceEntity[]>;
  noteTargets: EntityRelation<NoteTargetWorkspaceEntity[]>;
  attachments: EntityRelation<AttachmentWorkspaceEntity[]>;
  timelineActivities: EntityRelation<TimelineActivityWorkspaceEntity[]>;
}
