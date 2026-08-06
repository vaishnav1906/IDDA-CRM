import { Injectable, Logger } from '@nestjs/common';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { DISPATCH_NOTIFICATION_JOB_NAME } from 'src/modules/idda-notifications/constants/dispatch-notification-job-name.constant';
import {
  type DispatchNotificationJobData,
  type NotificationPayload,
} from 'src/modules/idda-notifications/types/notification-payload.type';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.iddaNotificationQueue)
    private readonly notificationQueueService: MessageQueueService,
  ) {}

  /**
   * Enqueues a notification for async dispatch. The processor decides
   * whether to create an in-app record, send an email, or both based
   * on payload.channel.
   */
  async dispatch(payload: NotificationPayload): Promise<void> {
    this.logger.log(
      `Dispatching ${payload.channel} notification "${payload.title}" ` +
        `to workspace member ${payload.recipientWorkspaceMemberId}`,
    );

    await this.notificationQueueService.add<DispatchNotificationJobData>(
      DISPATCH_NOTIFICATION_JOB_NAME,
      { workspaceId: payload.workspaceId, payload },
    );
  }

  /**
   * Convenience method: dispatch an in-app-only notification.
   */
  async dispatchInApp(
    payload: Omit<NotificationPayload, 'channel'>,
  ): Promise<void> {
    await this.dispatch({ ...payload, channel: 'IN_APP' });
  }

  /**
   * Convenience method: dispatch an email-only notification.
   * `recipientEmail` must be set on the payload.
   */
  async dispatchEmail(
    payload: Omit<NotificationPayload, 'channel'> & { recipientEmail: string },
  ): Promise<void> {
    await this.dispatch({ ...payload, channel: 'EMAIL' });
  }
}
