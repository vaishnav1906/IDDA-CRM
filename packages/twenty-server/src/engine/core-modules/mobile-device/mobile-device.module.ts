import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { MobileDeviceTokenEntity } from 'src/engine/core-modules/mobile-device/mobile-device-token.entity';
import { MobileDeviceFcmService } from 'src/engine/core-modules/mobile-device/mobile-device-fcm.service';
import { MobileDeviceTokenController } from 'src/engine/core-modules/mobile-device/mobile-device-token.controller';
import { MobileDeviceTokenService } from 'src/engine/core-modules/mobile-device/mobile-device-token.service';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MobileDeviceTokenEntity]),
    TokenModule,
    JwtModule,
    WorkspaceCacheStorageModule,
  ],
  controllers: [MobileDeviceTokenController],
  providers: [MobileDeviceTokenService, MobileDeviceFcmService],
  exports: [MobileDeviceFcmService],
})
export class MobileDeviceModule {}
