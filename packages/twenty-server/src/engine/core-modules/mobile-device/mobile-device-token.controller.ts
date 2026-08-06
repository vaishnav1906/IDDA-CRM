import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { MobileDeviceTokenService } from 'src/engine/core-modules/mobile-device/mobile-device-token.service';

class RegisterFcmTokenDto {
  token: string;
  platform: string;
}

@Controller('api/mobile')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
@UseFilters(RestApiExceptionFilter)
export class MobileDeviceTokenController {
  constructor(
    private readonly mobileDeviceTokenService: MobileDeviceTokenService,
  ) {}

  @Post('fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerToken(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Body() body: RegisterFcmTokenDto,
  ): Promise<void> {
    await this.mobileDeviceTokenService.upsert(
      workspace.id,
      workspaceMemberId,
      body.token,
      body.platform ?? 'android',
    );
  }
}
