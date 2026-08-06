import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as webPush from 'web-push';
import { Repository } from 'typeorm';

import { PushSubscriptionEntity } from 'src/engine/core-modules/push-subscription/push-subscription.entity';

export type PushPayload = {
  title: string;
  body?: string;
  actionUrl?: string;
  icon?: string;
  badge?: string;
};

@Injectable()
export class PushSubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(PushSubscriptionService.name);
  private vapidConfigured = false;

  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly repo: Repository<PushSubscriptionEntity>,
  ) {}

  onModuleInit(): void {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const contactEmail =
      process.env.VAPID_CONTACT_EMAIL ?? 'admin@example.com';

    if (publicKey && privateKey) {
      webPush.setVapidDetails(
        `mailto:${contactEmail}`,
        publicKey,
        privateKey,
      );
      this.vapidConfigured = true;
      this.logger.log('Web Push VAPID configured');
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications disabled',
      );
    }
  }

  async subscribe(
    workspaceId: string,
    workspaceMemberId: string,
    endpoint: string,
    p256dhKey: string,
    authKey: string,
  ): Promise<void> {
    const existing = await this.repo.findOne({ where: { endpoint } });

    if (existing) {
      await this.repo.update(existing.id, {
        workspaceId,
        workspaceMemberId,
        p256dhKey,
        authKey,
      });
    } else {
      await this.repo.save(
        this.repo.create({
          workspaceId,
          workspaceMemberId,
          endpoint,
          p256dhKey,
          authKey,
        }),
      );
    }
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.repo.delete({ endpoint });
  }

  async getSubscriptionsForMember(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<PushSubscriptionEntity[]> {
    return this.repo.find({ where: { workspaceId, workspaceMemberId } });
  }

  async sendPushToMember(
    workspaceId: string,
    workspaceMemberId: string,
    payload: PushPayload,
  ): Promise<void> {
    if (!this.vapidConfigured) {
      return;
    }

    const subscriptions = await this.getSubscriptionsForMember(
      workspaceId,
      workspaceMemberId,
    );

    if (subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body ?? '',
      actionUrl: payload.actionUrl ?? '/notifications',
      icon: payload.icon ?? '/favicon/favicon-96x96.png',
      badge: payload.badge ?? '/favicon/favicon-96x96.png',
    });

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dhKey,
              auth: sub.authKey,
            },
          },
          pushPayload,
        );
      } catch (err: unknown) {
        const statusCode =
          err instanceof webPush.WebPushError ? err.statusCode : 0;

        if (statusCode === 410 || statusCode === 404) {
          this.logger.log(
            `Stale push subscription removed: ${sub.endpoint.slice(0, 60)}…`,
          );
          await this.repo.delete(sub.id);
        } else {
          this.logger.error(
            `Failed to send push to ${sub.endpoint.slice(0, 60)}…: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    }
  }
}
