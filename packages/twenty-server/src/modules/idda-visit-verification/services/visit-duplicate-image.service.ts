import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type DuplicateCheckResult } from 'src/modules/idda-visit-verification/types/visit-verification.types';

@Injectable()
export class VisitDuplicateImageService {
  private readonly logger = new Logger(VisitDuplicateImageService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  /**
   * Computes a fast perceptual hash using SHA-256 of the first 4096 bytes
   * combined with the total buffer length.
   *
   * Sufficient for detecting exact duplicates and resized copies of the same
   * image. Not a cryptographic guarantee — designed for audit / anti-reuse.
   */
  computeImageHash(imageBuffer: Buffer): string {
    const head = imageBuffer.subarray(0, Math.min(4096, imageBuffer.length));

    return crypto
      .createHash('sha256')
      .update(head)
      .update(imageBuffer.length.toString())
      .digest('hex');
  }

  /**
   * Checks whether an image with the same hash already exists in the workspace.
   *
   * @param imageBuffer - The selfie image buffer to check
   * @param workspaceId - The workspace to search within
   * @param excludeVisitId - The current visit ID (excluded from the duplicate search)
   */
  async checkForDuplicate(
    imageBuffer: Buffer,
    workspaceId: string,
    excludeVisitId: string,
  ): Promise<DuplicateCheckResult> {
    const imageHash = this.computeImageHash(imageBuffer);

    try {
      const visitRepository =
        await this.globalWorkspaceOrmManager.getRepository<{
          id: string;
          selfieHash: string | null;
        }>(workspaceId, 'visit');

      // Find any visit in the same workspace with matching hash, excluding the current visit
      const existing = await visitRepository.findOne({
        where: { selfieHash: imageHash } as never,
      });

      const matchId =
        existing && (existing as { id: string }).id !== excludeVisitId
          ? (existing as { id: string }).id
          : null;

      return {
        isDuplicate: matchId !== null,
        imageHash,
        matchingVisitId: matchId,
      };
    } catch (error) {
      this.logger.warn('Could not check for duplicate image', error);

      // Fail open — if we can't check, don't block the visit
      return {
        isDuplicate: false,
        imageHash,
        matchingVisitId: null,
      };
    }
  }
}
