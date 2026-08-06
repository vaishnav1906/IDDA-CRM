import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PushSubscriptionEntity } from 'src/engine/core-modules/push-subscription/push-subscription.entity';
import { PushSubscriptionResolver } from 'src/engine/core-modules/push-subscription/push-subscription.resolver';
import { PushSubscriptionService } from 'src/engine/core-modules/push-subscription/push-subscription.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscriptionEntity])],
  providers: [PushSubscriptionService, PushSubscriptionResolver],
  exports: [PushSubscriptionService],
})
export class PushSubscriptionModule {}
