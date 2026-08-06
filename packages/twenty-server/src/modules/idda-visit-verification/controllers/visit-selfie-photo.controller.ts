import fs from 'fs';

import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { type Request, type Response } from 'express';

import { FileApiExceptionFilter } from 'src/engine/core-modules/file/filters/file-api-exception.filter';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { ClinicPhotoServeGuard } from 'src/modules/idda-visit-verification/guards/clinic-photo-serve.guard';
import { VisitSelfieStorageService } from 'src/modules/idda-visit-verification/services/visit-selfie-storage.service';

@Controller('visit-selfie-photo')
@UseFilters(FileApiExceptionFilter)
export class VisitSelfiePhotoController {
  private readonly logger = new Logger(VisitSelfiePhotoController.name);

  constructor(
    private readonly selfieStorageService: VisitSelfieStorageService,
  ) {}

  /**
   * GET /visit-selfie-photo/:visitId?token=<signed-jwt>
   *
   * Serves agent selfie photos directly from local storage.
   * Reuses ClinicPhotoServeGuard — the JWT structure is identical.
   */
  @Get(':visitId')
  @UseGuards(ClinicPhotoServeGuard, NoPermissionGuard)
  async serveSelfiePhoto(
    @Param('visitId') visitId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // oxlint-disable-next-line typescript/no-explicit-any
    const workspaceId = (req as any).workspaceId as string;

    const localPath =
      this.selfieStorageService.getLocalSelfieePath(
        workspaceId,
        `visit-selfie/${visitId}.jpg`,
      ) ??
      this.selfieStorageService.getLocalSelfieePath(
        workspaceId,
        `visit-selfie/${visitId}.png`,
      );

    const mimeType = localPath?.endsWith('.png') ? 'image/png' : 'image/jpeg';

    if (!localPath) {
      this.logger.warn(
        `Selfie not found on disk visitId=${visitId} workspaceId=${workspaceId}`,
      );
      throw new NotFoundException('Selfie photo not found.');
    }

    this.logger.log(`Serving selfie visitId=${visitId} path=${localPath}`);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="selfie-${visitId}.jpg"`,
    );

    fs.createReadStream(localPath).pipe(res);
  }
}
