import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export type InAppNotificationType =
  | 'WORKFLOW_ACTION'
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'LEAD_ASSIGNED'
  | 'SLA_WARNING'
  | 'SLA_BREACH'
  | 'NEXT_STEP_MISSING'
  | 'LEAD_CONVERTED'
  | 'OPP_WON_HANDOFF'
  | 'MENTION'
  | 'FOLLOW_UP_REMINDER'
  | 'SYSTEM';

export class InAppNotificationWorkspaceEntity extends BaseWorkspaceEntity {
  title: string;
  body: string | null;
  notificationType: InAppNotificationType;
  isRead: boolean;
  actionUrl: string | null;
  relatedRecordId: string | null;
  relatedObjectMetadataId: string | null;
  position: number;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
  recipient: EntityRelation<WorkspaceMemberWorkspaceEntity> | null;
  recipientId: string | null;
}
