import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { PushSubscriptionModule } from 'src/engine/core-modules/push-subscription/push-subscription.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { DispatchNotificationJob } from 'src/modules/idda-notifications/jobs/dispatch-notification.job';
import { NotificationCountController } from 'src/modules/idda-notifications/notification-count.controller';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';

@Module({
  imports: [
    MessageQueueModule,
    EmailModule,
    PushSubscriptionModule,
    TokenModule,
    JwtModule,
    WorkspaceCacheStorageModule,
    WorkspaceCacheModule,
    TwentyORMModule,
  ],
  controllers: [NotificationCountController],
  providers: [NotificationDispatchService, DispatchNotificationJob],
  exports: [NotificationDispatchService],
})
export class IddaNotificationsModule {}
