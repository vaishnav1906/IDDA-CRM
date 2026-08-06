import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { FileFolder } from 'twenty-shared/types';

import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { VisitClinicPhotoStorageService } from 'src/modules/idda-visit-verification/services/visit-clinic-photo-storage.service';

const MAX_PHOTO_BASE64_BYTES = 10 * 1024 * 1024; // 10 MB base64 ≈ ~7.5 MB decoded

@Injectable()
export class VisitClinicPhotoService {
  private readonly logger = new Logger(VisitClinicPhotoService.name);

  constructor(
    private readonly clinicPhotoStorageService: VisitClinicPhotoStorageService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly fileUrlService: FileUrlService,
  ) {}

  async uploadClinicPhoto(
    visitId: string,
    photoBase64: string,
    workspaceId: string,
  ): Promise<string> {
    if (photoBase64.length > MAX_PHOTO_BASE64_BYTES) {
      throw new BadRequestException('Clinic photo exceeds 10 MB limit.');
    }

    const base64Data = photoBase64.includes(',')
      ? photoBase64.split(',')[1]
      : photoBase64;

    let imageBuffer: Buffer;

    try {
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (err) {
      throw new BadRequestException('Invalid clinic photo data.');
    }

    const mimeType = photoBase64.startsWith('data:image/png')
      ? 'image/png'
      : 'image/jpeg';

    // ── Step 3: write file to disk (no ORM context needed) ───────────────────
    let storedPath: string;

    try {
      storedPath = await this.clinicPhotoStorageService.storePhoto(
        imageBuffer,
        mimeType,
        workspaceId,
        visitId,
      );
    } catch (err) {
      throw err;
    }

    // ── Step 4: update visit.clinicPhoto inside workspace ORM context ─────────
    // Security: this mutation is guarded by WorkspaceAuthGuard; the visitId was
    // produced by the caller's own createVisit mutation in the same workspace.
    // System auth with bypass is correct — ownership was enforced at visit creation.
    const authContext = buildSystemAuthContext(workspaceId);

    const updateResult =
      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const visitRepository =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              'visit',
              { shouldBypassPermissionChecks: true },
            );

          return visitRepository.update(
            { id: visitId } as never,
            { clinicPhoto: storedPath } as never,
          );
        },
        authContext,
      );

    const affected = (updateResult as { affected?: number }).affected;

    if (affected !== 1) {
      throw new BadRequestException(
        `Visit ${visitId} not found — clinicPhoto was not saved.`,
      );
    }

    return storedPath;
  }

  async getSelfiePhotoUrl(
    visitId: string,
    workspaceId: string,
  ): Promise<string | null> {
    const authContext = buildSystemAuthContext(workspaceId);

    try {
      return await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const visitRepository =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              'visit',
              { shouldBypassPermissionChecks: true },
            );

          const visit = await visitRepository.findOne({
            where: { id: visitId } as never,
          });

          const selfiePhotoValue = visit
            ? (visit as Record<string, unknown>)['selfiePhoto']
            : undefined;

          if (!visit || !selfiePhotoValue) return null;

          // Sign with VisitSelfie folder; controller serves from visit-selfie/ on disk
          const rawUrl = await this.fileUrlService.signFileByIdUrl({
            fileId: visitId,
            workspaceId,
            fileFolder: FileFolder.VisitSelfie,
          });

          // Rewrite /file/visit-selfie/ → /visit-selfie-photo/
          return rawUrl.replace(
            `/file/${FileFolder.VisitSelfie}/`,
            '/visit-selfie-photo/',
          );
        },
        authContext,
      );
    } catch (err) {
      this.logger.error(`getSelfiePhotoUrl THREW visitId=${visitId}`, err);

      return null;
    }
  }

  async getClinicPhotoUrl(
    visitId: string,
    workspaceId: string,
  ): Promise<string | null> {
    const authContext = buildSystemAuthContext(workspaceId);

    try {
      return await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const visitRepository =
            await this.globalWorkspaceOrmManager.getRepository(
              workspaceId,
              'visit',
              { shouldBypassPermissionChecks: true },
            );

          const visit = await visitRepository.findOne({
            where: { id: visitId } as never,
          });

          const clinicPhotoValue = visit
            ? (visit as Record<string, unknown>)['clinicPhoto']
            : undefined;

          if (!visit || !clinicPhotoValue) {
            return null;
          }

          // Sign a JWT token reusing the same FileToken structure so
          // ClinicPhotoServeGuard can validate it. Redirect the URL from the
          // standard /file/clinic-photo/ path (which requires a core.file
          // registry entry) to /visit-clinic-photo/ which serves from disk directly.
          const rawUrl = await this.fileUrlService.signFileByIdUrl({
            fileId: visitId,
            workspaceId,
            fileFolder: FileFolder.ClinicPhoto,
          });

          // Rewrite /file/clinic-photo/{visitId} → /visit-clinic-photo/{visitId}
          const signedUrl = rawUrl.replace(
            `/file/${FileFolder.ClinicPhoto}/`,
            '/visit-clinic-photo/',
          );

          return signedUrl;
        },
        authContext,
      );
    } catch (err) {
      this.logger.error(`getClinicPhotoUrl THREW visitId=${visitId}`, err);

      return null;
    }
  }
}
