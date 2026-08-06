import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { MobileDeviceTokenEntity } from 'src/engine/core-modules/mobile-device/mobile-device-token.entity';

@Injectable()
export class MobileDeviceTokenService {
  constructor(
    @InjectRepository(MobileDeviceTokenEntity)
    private readonly repo: Repository<MobileDeviceTokenEntity>,
  ) {}

  async upsert(
    workspaceId: string,
    workspaceMemberId: string,
    fcmToken: string,
    platform: string,
  ): Promise<void> {
    const existing = await this.repo.findOne({ where: { fcmToken } });

    if (existing) {
      await this.repo.update(existing.id, {
        workspaceId,
        workspaceMemberId,
        platform,
      });
    } else {
      await this.repo.save(
        this.repo.create({ workspaceId, workspaceMemberId, fcmToken, platform }),
      );
    }
  }

  async getTokensForMember(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<MobileDeviceTokenEntity[]> {
    return this.repo.find({ where: { workspaceId, workspaceMemberId } });
  }

  async removeStaleToken(fcmToken: string): Promise<void> {
    await this.repo.delete({ fcmToken });
  }
}
