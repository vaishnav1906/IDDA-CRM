import { type InAppNotificationType } from 'src/modules/idda-notifications/standard-objects/in-app-notification.workspace-entity';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'BOTH';

export type NotificationPayload = {
  workspaceId: string;
  recipientWorkspaceMemberId: string;
  recipientEmail?: string;
  title: string;
  body: string;
  notificationType: InAppNotificationType;
  channel: NotificationChannel;
  actionUrl?: string;
  relatedRecordId?: string;
  relatedObjectMetadataId?: string;
};

export type DispatchNotificationJobData = {
  workspaceId: string;
  payload: NotificationPayload;
};
