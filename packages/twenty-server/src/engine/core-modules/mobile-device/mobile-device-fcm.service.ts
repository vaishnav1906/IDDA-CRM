import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FirebaseError } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

import { MobileDeviceTokenService } from 'src/engine/core-modules/mobile-device/mobile-device-token.service';

export type FcmPushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

@Injectable()
export class MobileDeviceFcmService implements OnModuleInit {
  private readonly logger = new Logger(MobileDeviceFcmService.name);
  private initialized = false;

  constructor(
    private readonly mobileDeviceTokenService: MobileDeviceTokenService,
  ) {}

  onModuleInit(): void {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY not set — mobile push notifications disabled',
      );
      return;
    }

    if (!getApps().length) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    }

    this.initialized = true;
    this.logger.log('Firebase Admin initialized — mobile push enabled');
  }

  async sendToMember(
    workspaceId: string,
    workspaceMemberId: string,
    payload: FcmPushPayload,
  ): Promise<void> {
    if (!this.initialized) return;

    const tokens = await this.mobileDeviceTokenService.getTokensForMember(
      workspaceId,
      workspaceMemberId,
    );

    if (tokens.length === 0) return;

    for (const device of tokens) {
      try {
        await getMessaging().send({
          token: device.fcmToken,
          notification: { title: payload.title, body: payload.body },
          data: payload.data ?? {},
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } },
        });
      } catch (err: unknown) {
        const code = err instanceof FirebaseError ? err.code : 'unknown';

        if (
          code === 'registration-token-not-registered' ||
          code === 'invalid-registration-token'
        ) {
          this.logger.log(`Removing stale FCM token for member ${workspaceMemberId}`);
          await this.mobileDeviceTokenService.removeStaleToken(device.fcmToken);
        } else {
          this.logger.error(
            `Failed to send FCM to member ${workspaceMemberId}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    }
  }
}
