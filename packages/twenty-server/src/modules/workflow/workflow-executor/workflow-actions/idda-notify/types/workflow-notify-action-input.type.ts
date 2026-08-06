import { type NotificationChannel } from 'src/modules/idda-notifications/types/notification-payload.type';
import { type InAppNotificationType } from 'src/modules/idda-notifications/standard-objects/in-app-notification.workspace-entity';

export type WorkflowNotifyActionInput = {
  recipientWorkspaceMemberId: string;
  recipientEmail?: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  notificationType: InAppNotificationType;
  actionUrl?: string;
  relatedRecordId?: string;
  relatedObjectMetadataId?: string;
};
