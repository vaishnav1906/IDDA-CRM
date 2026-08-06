import { Injectable, Logger } from '@nestjs/common';

import { type FaceVerificationResult } from 'src/modules/idda-visit-verification/types/visit-verification.types';

/**
 * Interface for future ML-based face detection providers.
 * Inject a concrete implementation to enable server-side face detection.
 */
export interface FaceDetectionProvider {
  detectFace(imageBuffer: Buffer): Promise<FaceVerificationResult>;
}

/**
 * Minimum viable image size in bytes (to filter out trivially small/corrupt images).
 */
const MIN_IMAGE_SIZE_BYTES = 4096;

@Injectable()
export class VisitFaceService {
  private readonly logger = new Logger(VisitFaceService.name);

  /**
   * Reads JPEG dimensions from buffer using the SOF0 (Start of Frame) marker.
   * Returns null if the marker cannot be found (non-JPEG or truncated).
   */
  private readJpegDimensions(
    buffer: Buffer,
  ): { width: number; height: number } | null {
    // JPEG SOF markers start with 0xFF followed by 0xC0–0xC3, 0xC5–0xC7, 0xC9–0xCB, 0xCD–0xCF
    let offset = 2; // skip SOI (FF D8)

    while (offset < buffer.length - 1) {
      if (buffer[offset] !== 0xff) break;

      const marker = buffer[offset + 1];

      // SOF markers
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (offset + 9 >= buffer.length) return null;
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);

        return { width, height };
      }

      // Skip to next marker
      if (offset + 3 >= buffer.length) break;
      const segmentLength = buffer.readUInt16BE(offset + 2);

      offset += 2 + segmentLength;
    }

    return null;
  }

  /**
   * Validates image headers for JPEG (FFD8FF) or PNG (89504E47).
   */
  private isValidImageHeader(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;

    const isJpeg =
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;

    return isJpeg || isPng;
  }

  /**
   * Basic face quality check for MVP.
   * Returns faceDetected: true when basic image checks pass.
   * Replace with FaceDetectionProvider injection for production ML inference.
   *
   * TODO: Inject FaceDetectionProvider here for ML-based face detection:
   *   constructor(private readonly faceDetectionProvider: FaceDetectionProvider) {}
   *   return this.faceDetectionProvider.detectFace(imageBuffer);
   */
  async verifyFaceQuality(imageBuffer: Buffer): Promise<FaceVerificationResult> {
    try {
      if (!this.isValidImageHeader(imageBuffer)) {
        return { faceDetected: false, selfieStatus: 'MISSING' };
      }

      if (imageBuffer.length < MIN_IMAGE_SIZE_BYTES) {
        this.logger.warn(
          `Selfie image too small: ${imageBuffer.length} bytes`,
        );

        return { faceDetected: false, selfieStatus: 'FACE_NOT_CLEAR' };
      }

      // Read JPEG dimensions to detect suspiciously small captures
      const dimensions = this.readJpegDimensions(imageBuffer);

      if (dimensions !== null) {
        if (dimensions.width < 50 || dimensions.height < 50) {
          return { faceDetected: false, selfieStatus: 'FACE_NOT_CLEAR' };
        }
      }

      // MVP: assume face detected when basic checks pass
      // Swap for real ML provider before production
      return { faceDetected: true, selfieStatus: 'CLEAR' };
    } catch (error) {
      this.logger.error('Face verification error', error);

      return { faceDetected: false, selfieStatus: 'MISSING' };
    }
  }
}
