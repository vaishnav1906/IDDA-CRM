import { Logger, Scope } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { EmailSenderService } from 'src/engine/core-modules/email/email-sender.service';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { PushSubscriptionService } from 'src/engine/core-modules/push-subscription/push-subscription.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { DISPATCH_NOTIFICATION_JOB_NAME } from 'src/modules/idda-notifications/constants/dispatch-notification-job-name.constant';
import { InAppNotificationWorkspaceEntity } from 'src/modules/idda-notifications/standard-objects/in-app-notification.workspace-entity';
import { type DispatchNotificationJobData } from 'src/modules/idda-notifications/types/notification-payload.type';

@Processor({ queueName: MessageQueue.iddaNotificationQueue, scope: Scope.REQUEST })
export class DispatchNotificationJob {
  private readonly logger = new Logger(DispatchNotificationJob.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly emailSenderService: EmailSenderService,
    private readonly pushSubscriptionService: PushSubscriptionService,
  ) {}

  @Process(DISPATCH_NOTIFICATION_JOB_NAME)
  async handle({ workspaceId, payload }: DispatchNotificationJobData): Promise<void> {
    this.logger.log(
      `Processing ${payload.channel} notification "${payload.title}" ` +
        `for workspace ${workspaceId}`,
    );

    const authContext = buildSystemAuthContext(workspaceId);

    if (payload.channel === 'IN_APP' || payload.channel === 'BOTH') {
      await this.createInAppNotification({ workspaceId, payload, authContext });
      await this.pushSubscriptionService.sendPushToMember(
        workspaceId,
        payload.recipientWorkspaceMemberId,
        {
          title: payload.title,
          body: payload.body,
          actionUrl: payload.actionUrl ?? '/notifications',
        },
      );
    }

    if (
      (payload.channel === 'EMAIL' || payload.channel === 'BOTH') &&
      isDefined(payload.recipientEmail)
    ) {
      await this.sendEmailNotification({ payload });
    }
  }

  private async createInAppNotification({
    workspaceId,
    payload,
    authContext,
  }: {
    workspaceId: string;
    payload: DispatchNotificationJobData['payload'];
    authContext: ReturnType<typeof buildSystemAuthContext>;
  }): Promise<void> {
    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const repository = await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        'inAppNotification',
        { shouldBypassPermissionChecks: true },
      );

      await repository.save({
        title: payload.title,
        body: payload.body,
        notificationType: payload.notificationType,
        isRead: false,
        actionUrl: payload.actionUrl ?? null,
        relatedRecordId: payload.relatedRecordId ?? null,
        relatedObjectMetadataId: payload.relatedObjectMetadataId ?? null,
        recipientId: payload.recipientWorkspaceMemberId,
      } satisfies Partial<InAppNotificationWorkspaceEntity>);
    }, authContext);
  }

  private async sendEmailNotification({
    payload,
  }: {
    payload: DispatchNotificationJobData['payload'];
  }): Promise<void> {
    await this.emailSenderService.send({
      to: payload.recipientEmail,
      subject: payload.title,
      text: payload.body,
      html: `<p>${payload.body}</p>${
        isDefined(payload.actionUrl)
          ? `<p><a href="${payload.actionUrl}">View in IDDA CRM</a></p>`
          : ''
      }`,
    });
  }
}
