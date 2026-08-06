import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  VISIT_GEOFENCE_DEFAULTS,
  type VisitVerificationFactors,
} from 'src/modules/idda-visit-verification/constants/verification-scoring-weights.constant';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  type VerifyVisitInput,
  type VerifyVisitOutput,
} from 'src/modules/idda-visit-verification/types/visit-verification.types';
import { VisitDuplicateImageService } from 'src/modules/idda-visit-verification/services/visit-duplicate-image.service';
import { VisitExifService } from 'src/modules/idda-visit-verification/services/visit-exif.service';
import { VisitFaceService } from 'src/modules/idda-visit-verification/services/visit-face.service';
import { VisitGpsService } from 'src/modules/idda-visit-verification/services/visit-gps.service';
import { VisitScoringService } from 'src/modules/idda-visit-verification/services/visit-scoring.service';
import { VisitSelfieStorageService } from 'src/modules/idda-visit-verification/services/visit-selfie-storage.service';

/** Maximum raw selfie payload: 5 MB of base64 ≈ ~3.75 MB decoded image. */
const MAX_SELFIE_BASE64_BYTES = 5 * 1024 * 1024;

/** Minimum visit notes length to earn the notesCompleted score point. */
const MIN_NOTES_LENGTH = 10;

type CompanyRecord = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

type VisitRecord = {
  id: string;
  // Explicit assignee — present only after the employee relation migration runs.
  employeeId: string | null | undefined;
  // Twenty ACTOR field — always populated by the standard mutation pipeline.
  createdBy: { workspaceMemberId: string | null } | null | undefined;
};

@Injectable()
export class VisitVerificationOrchestratorService {
  private readonly logger = new Logger(
    VisitVerificationOrchestratorService.name,
  );

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly visitFaceService: VisitFaceService,
    private readonly visitExifService: VisitExifService,
    private readonly visitDuplicateImageService: VisitDuplicateImageService,
    private readonly visitGpsService: VisitGpsService,
    private readonly visitScoringService: VisitScoringService,
    private readonly visitSelfieStorageService: VisitSelfieStorageService,
  ) {}

  async verifyVisit(
    input: VerifyVisitInput,
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<VerifyVisitOutput> {
    // Security: system auth is used because this custom mutation does not go
    // through the standard workspace query runner. Ownership is enforced manually
    // before any writes occur. WorkspaceAuthGuard on the resolver guarantees the
    // caller is an authenticated member of this workspace.
    //
    // Owner resolution priority:
    //   1. visit.employeeId   — explicit assignee (available after migration)
    //   2. visit.createdBy.workspaceMemberId — always set by the mutation pipeline
    // If neither exists the request is rejected, not silently allowed.
    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const issues: string[] = [];

        // ── Step 0: Ownership check ─────────────────────────────────────────
        const visitRepository =
          await this.globalWorkspaceOrmManager.getRepository<VisitRecord>(
            workspaceId,
            'visit',
            { shouldBypassPermissionChecks: true },
          );

        const visit = await visitRepository.findOne({
          where: { id: input.visitId } as never,
        });

        if (!visit) {
          throw new BadRequestException(
            `Visit ${input.visitId} not found in this workspace.`,
          );
        }

        // ── Step 0b: Resolve canonical owner ───────────────────────────────
        // Priority: employeeId (future explicit assignee, deployed via migration)
        //           → createdBy.workspaceMemberId (always set by the mutation pipeline)
        // ?? treats both null and undefined as "not set", so:
        //   - employeeId = 'uuid'  → uses employeeId
        //   - employeeId = null    → deployed but unassigned, falls through to createdBy
        //   - employeeId = undefined → field not deployed, falls through to createdBy
        const ownerWorkspaceMemberId: string | null =
          visit.employeeId ??
          visit.createdBy?.workspaceMemberId ??
          null;

        if (ownerWorkspaceMemberId === null) {
          this.logger.error(
            `[OWNERSHIP] REJECTED — both employeeId and createdBy.workspaceMemberId are missing` +
              ` visitId=${input.visitId}`,
          );
          throw new BadRequestException('Visit ownership information is missing.');
        }

        if (ownerWorkspaceMemberId !== workspaceMemberId) {
          this.logger.error(
            `[OWNERSHIP] BLOCKED — mismatch` +
              ` owner=${ownerWorkspaceMemberId}` +
              ` authenticated=${workspaceMemberId}` +
              ` visitId=${input.visitId}`,
          );
          throw new ForbiddenException(
            'You are not authorised to verify this visit. Only the assigned employee may submit verification.',
          );
        }

        // ── Step 1: Validate notes ──────────────────────────────────────────
        if (!input.visitNotes || input.visitNotes.trim().length === 0) {
          throw new BadRequestException(
            'Visit notes are required for verification.',
          );
        }

        if (input.visitNotes.trim().length < MIN_NOTES_LENGTH) {
          throw new BadRequestException(
            `Visit notes must be at least ${MIN_NOTES_LENGTH} characters long.`,
          );
        }

        // ── Step 2: Validate and decode base64 selfie ───────────────────────
        if (input.selfieBase64.length > MAX_SELFIE_BASE64_BYTES) {
          throw new BadRequestException(
            'Selfie image is too large. Maximum allowed size is 5 MB.',
          );
        }

        let imageBuffer: Buffer;

        try {
          const base64Data = input.selfieBase64.includes(',')
            ? input.selfieBase64.split(',')[1]
            : input.selfieBase64;

          imageBuffer = Buffer.from(base64Data, 'base64');
        } catch {
          throw new BadRequestException('Invalid selfie image data.');
        }

        if (imageBuffer.length < 4) {
          throw new BadRequestException(
            'Selfie image data is invalid or corrupt.',
          );
        }

        const isJpeg =
          imageBuffer[0] === 0xff &&
          imageBuffer[1] === 0xd8 &&
          imageBuffer[2] === 0xff;
        const isPng =
          imageBuffer[0] === 0x89 &&
          imageBuffer[1] === 0x50 &&
          imageBuffer[2] === 0x4e &&
          imageBuffer[3] === 0x47;

        if (!isJpeg && !isPng) {
          throw new BadRequestException('Selfie must be a JPEG or PNG image.');
        }

        const mimeType = isPng ? 'image/png' : 'image/jpeg';

        // ── Step 3: Face verification ───────────────────────────────────────
        const faceResult =
          await this.visitFaceService.verifyFaceQuality(imageBuffer);

        if (!faceResult.faceDetected) {
          issues.push(`Selfie quality issue: ${faceResult.selfieStatus}`);
        }

        // ── Step 4: Store selfie (always — keeps audit trail) ───────────────
        let selfieUrl: string | null = null;

        try {
          selfieUrl = await this.visitSelfieStorageService.storeSelfie(
            imageBuffer,
            mimeType,
            workspaceId,
            input.visitId,
          );
        } catch (err) {
          this.logger.error('Failed to store selfie', err);
          issues.push('Selfie storage failed');
        }

        // ── Step 5: EXIF extraction ─────────────────────────────────────────
        const exifData = this.visitExifService.extractExifData(imageBuffer);

        if (exifData.hasMissingMetadata) {
          issues.push('EXIF metadata missing from image');
        }

        // ── Step 6: Duplicate image check ───────────────────────────────────
        const duplicateResult =
          await this.visitDuplicateImageService.checkForDuplicate(
            imageBuffer,
            workspaceId,
            input.visitId,
          );

        if (duplicateResult.isDuplicate) {
          issues.push(
            `Duplicate image detected — previously used in visit ${duplicateResult.matchingVisitId}`,
          );
        }

        // ── Step 7: GPS verification ────────────────────────────────────────
        let distanceFromClinic = 0;
        let locationStatus: 'WITHIN_RANGE' | 'OUTSIDE_RANGE' | 'SUSPICIOUS' =
          'OUTSIDE_RANGE';
        let isSuspiciousLocation = false;
        let gpsInsideGeofence = false;

        try {
          const companyRepository =
            await this.globalWorkspaceOrmManager.getRepository<CompanyRecord>(
              workspaceId,
              'company',
              { shouldBypassPermissionChecks: true },
            );

          const clinic = await companyRepository.findOne({
            where: { id: input.clinicId } as never,
          });

          if (
            clinic !== null &&
            clinic !== undefined &&
            clinic.latitude !== null &&
            clinic.longitude !== null
          ) {
            const gpsResult = this.visitGpsService.verifyLocation({
              latitude: input.latitude,
              longitude: input.longitude,
              gpsAccuracy: input.gpsAccuracy,
              clinicLatitude: clinic.latitude,
              clinicLongitude: clinic.longitude,
              radiusMeters: VISIT_GEOFENCE_DEFAULTS.radiusMeters,
              isMockLocation: input.isMockLocation ?? false,
            });

            distanceFromClinic = gpsResult.distanceFromClinic;
            locationStatus = gpsResult.locationStatus;
            isSuspiciousLocation = gpsResult.isSuspicious;
            gpsInsideGeofence = locationStatus === 'WITHIN_RANGE';
          } else {
            issues.push(
              'Clinic coordinates not available — GPS check skipped',
            );
          }
        } catch (err) {
          this.logger.error('GPS verification failed', err);
          issues.push('GPS verification error');
        }

        if (locationStatus !== 'WITHIN_RANGE') {
          issues.push(`Location status: ${locationStatus}`);
        }

        // ── Step 8: Compute score ───────────────────────────────────────────
        const factors: VisitVerificationFactors = {
          faceDetected: faceResult.faceDetected,
          liveCameraCapture: true,
          gpsInsideGeofence,
          highGpsAccuracy:
            input.gpsAccuracy <=
            VISIT_GEOFENCE_DEFAULTS.highAccuracyThresholdMeters,
          noMockLocation: !(input.isMockLocation ?? false),
          notesCompleted: input.visitNotes.trim().length >= MIN_NOTES_LENGTH,
          imageNotReused: !duplicateResult.isDuplicate,
        };

        const scoreResult = this.visitScoringService.computeScore(factors);

        const finalStatus =
          isSuspiciousLocation &&
          scoreResult.verificationStatus !== 'UNVERIFIED'
            ? 'NEEDS_REVIEW'
            : scoreResult.verificationStatus;

        // ── Step 9: Persist verification result ─────────────────────────────
        // Reuses visitRepository obtained in Step 0 — already inside context.
        try {
          await visitRepository.update(
            { id: input.visitId } as never,
            {
              latitude: input.latitude,
              longitude: input.longitude,
              gpsAccuracy: input.gpsAccuracy,
              distanceFromClinic,
              locationStatus,
              liveCameraCapture: true,
              imageReused: duplicateResult.isDuplicate,
              verificationScore: scoreResult.score,
              verificationStatus: finalStatus,
              selfieStatus: faceResult.selfieStatus,
              ...(selfieUrl ? { selfiePhoto: selfieUrl } : {}),
            } as never,
          );
        } catch (err) {
          this.logger.error('Failed to update visit record', err);
          issues.push('Visit record update failed');
        }

        return {
          success: issues.length === 0 || scoreResult.score > 0,
          verificationScore: scoreResult.score,
          verificationStatus: finalStatus,
          selfieStatus: faceResult.selfieStatus,
          locationStatus,
          distanceFromClinic,
          imageReused: duplicateResult.isDuplicate,
          selfieUrl,
          issues,
          scoreBreakdown: scoreResult.breakdown,
        };
      },
      authContext,
    );
  }
}
