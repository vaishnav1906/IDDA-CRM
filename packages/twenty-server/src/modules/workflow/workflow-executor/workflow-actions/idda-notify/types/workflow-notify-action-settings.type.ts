import { type InAppNotificationType } from 'src/modules/idda-notifications/standard-objects/in-app-notification.workspace-entity';
import { type NotificationChannel } from 'src/modules/idda-notifications/types/notification-payload.type';
import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowNotifyActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/types/workflow-notify-action-input.type';

export type WorkflowNotifyActionSettings = BaseWorkflowActionSettings & {
  channel: NotificationChannel;
  notificationType: InAppNotificationType;
  input: WorkflowNotifyActionInput;
};
