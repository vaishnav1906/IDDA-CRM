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
import { VisitClinicPhotoStorageService } from 'src/modules/idda-visit-verification/services/visit-clinic-photo-storage.service';

@Controller('visit-clinic-photo')
@UseFilters(FileApiExceptionFilter)
export class VisitClinicPhotoController {
  private readonly logger = new Logger(VisitClinicPhotoController.name);

  constructor(
    private readonly storageService: VisitClinicPhotoStorageService,
  ) {}

  /**
   * GET /visit-clinic-photo/:visitId?token=<signed-jwt>
   *
   * Serves clinic exterior photos directly from local storage without
   * requiring a core.file registry entry. The token is the same JWT
   * produced by FileUrlService.signFileByIdUrl() — ClinicPhotoServeGuard
   * validates it and sets req.workspaceId.
   *
   * This endpoint is intentionally temporary. Once the file registry
   * integration is complete, this route will be superseded by the standard
   * /file/clinic-photo/:id endpoint.
   */
  @Get(':visitId')
  @UseGuards(ClinicPhotoServeGuard, NoPermissionGuard)
  async serveClinicPhoto(
    @Param('visitId') visitId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // oxlint-disable-next-line typescript/no-explicit-any
    const workspaceId = (req as any).workspaceId as string;

    // Try JPEG first (camera output default), then PNG
    let localPath =
      this.storageService.getLocalPhotoPath(
        workspaceId,
        `clinic-photo/${visitId}.jpg`,
      ) ??
      this.storageService.getLocalPhotoPath(
        workspaceId,
        `clinic-photo/${visitId}.png`,
      );

    const mimeType = localPath?.endsWith('.png') ? 'image/png' : 'image/jpeg';

    if (!localPath) {
      this.logger.warn(
        `ClinicPhoto not found on disk visitId=${visitId} workspaceId=${workspaceId}`,
      );
      throw new NotFoundException('Clinic photo not found.');
    }

    this.logger.log(
      `Serving clinic photo visitId=${visitId} path=${localPath}`,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="clinic-${visitId}.jpg"`,
    );

    fs.createReadStream(localPath).pipe(res);
  }
}
