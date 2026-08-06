import { Injectable, Logger } from '@nestjs/common';

import { type ExifData } from 'src/modules/idda-visit-verification/types/visit-verification.types';

/**
 * Parses EXIF metadata from JPEG buffers without external dependencies.
 * Uses APP1 (0xFFE1) marker and reads the EXIF IFD.
 */
@Injectable()
export class VisitExifService {
  private readonly logger = new Logger(VisitExifService.name);

  /**
   * Reads a null-terminated ASCII string from the buffer at the given offset.
   */
  private readAsciiString(buffer: Buffer, offset: number, length: number): string {
    return buffer.subarray(offset, offset + length).toString('ascii').replace(/\0/g, '');
  }

  /**
   * Parses a rational value (numerator/denominator pair) stored as two UINT32s.
   */
  private readRational(
    buffer: Buffer,
    offset: number,
    littleEndian: boolean,
  ): number {
    const readU32 = littleEndian
      ? buffer.readUInt32LE.bind(buffer)
      : buffer.readUInt32BE.bind(buffer);
    const num = readU32(offset);
    const den = readU32(offset + 4);

    return den === 0 ? 0 : num / den;
  }

  /**
   * Converts GPS degrees/minutes/seconds to decimal degrees.
   */
  private gpsToDecimal(
    buffer: Buffer,
    valOffset: number,
    littleEndian: boolean,
  ): number {
    const degrees = this.readRational(buffer, valOffset, littleEndian);
    const minutes = this.readRational(buffer, valOffset + 8, littleEndian);
    const seconds = this.readRational(buffer, valOffset + 16, littleEndian);

    return degrees + minutes / 60 + seconds / 3600;
  }

  /**
   * Parses an IFD at the given offset and returns a map of tag → value offset.
   */
  private parseIfd(
    buffer: Buffer,
    ifdOffset: number,
    tiffStart: number,
    littleEndian: boolean,
  ): Map<number, { type: number; count: number; valueOffset: number }> {
    const result = new Map<
      number,
      { type: number; count: number; valueOffset: number }
    >();

    try {
      const readU16 = littleEndian
        ? buffer.readUInt16LE.bind(buffer)
        : buffer.readUInt16BE.bind(buffer);
      const readU32 = littleEndian
        ? buffer.readUInt32LE.bind(buffer)
        : buffer.readUInt32BE.bind(buffer);

      const entryCount = readU16(tiffStart + ifdOffset);

      for (let i = 0; i < entryCount; i++) {
        const entryOffset = tiffStart + ifdOffset + 2 + i * 12;

        if (entryOffset + 12 > buffer.length) break;

        const tag = readU16(entryOffset);
        const type = readU16(entryOffset + 2);
        const count = readU32(entryOffset + 4);

        // For values <= 4 bytes the value is stored inline; otherwise it's an offset into the TIFF block
        const typeSize = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8][type] ?? 1;
        const totalSize = typeSize * count;
        const valueOffset =
          totalSize <= 4
            ? entryOffset + 8 // inline value
            : tiffStart + readU32(entryOffset + 8); // pointer into TIFF block

        result.set(tag, { type, count, valueOffset });
      }
    } catch (err) {
      this.logger.debug('EXIF IFD parse error', err);
    }

    return result;
  }

  /**
   * Extracts DateTimeOriginal (tag 0x9003) and GPS coordinates (tag 0x8825)
   * from a JPEG buffer. Falls back gracefully — returns hasMissingMetadata: true
   * when the data is absent or the buffer is not a JPEG.
   */
  extractExifData(imageBuffer: Buffer): ExifData {
    const empty: ExifData = {
      dateTimeOriginal: null,
      gpsLatitude: null,
      gpsLongitude: null,
      hasMissingMetadata: true,
    };

    try {
      // Must start with JPEG SOI (FF D8)
      if (
        imageBuffer.length < 4 ||
        imageBuffer[0] !== 0xff ||
        imageBuffer[1] !== 0xd8
      ) {
        return empty;
      }

      // Find APP1 segment (FF E1)
      let app1Start = -1;

      for (let i = 2; i < Math.min(imageBuffer.length - 2, 65536); ) {
        if (imageBuffer[i] !== 0xff) break;

        const marker = imageBuffer[i + 1];
        const segLen = imageBuffer.readUInt16BE(i + 2);

        if (marker === 0xe1) {
          app1Start = i;
          break;
        }

        i += 2 + segLen;
      }

      if (app1Start < 0) return empty;

      const app1DataStart = app1Start + 4; // skip FF E1 + length
      const exifHeader = imageBuffer
        .subarray(app1DataStart, app1DataStart + 6)
        .toString('ascii');

      if (!exifHeader.startsWith('Exif')) return empty;

      const tiffStart = app1DataStart + 6; // skip "Exif\0\0"
      const byteOrder = imageBuffer.readUInt16BE(tiffStart);
      const littleEndian = byteOrder === 0x4949; // II = little endian, MM = big endian

      const readU32 = littleEndian
        ? imageBuffer.readUInt32LE.bind(imageBuffer)
        : imageBuffer.readUInt32BE.bind(imageBuffer);
      const readU16 = littleEndian
        ? imageBuffer.readUInt16LE.bind(imageBuffer)
        : imageBuffer.readUInt16BE.bind(imageBuffer);

      // IFD0 offset is at bytes 4–7 of TIFF block
      const ifd0Offset = readU32(tiffStart + 4);
      const ifd0 = this.parseIfd(imageBuffer, ifd0Offset, tiffStart, littleEndian);

      let dateTimeOriginal: Date | null = null;
      let gpsLatitude: number | null = null;
      let gpsLongitude: number | null = null;

      // Tag 0x8769: ExifIFD pointer
      const exifIfdEntry = ifd0.get(0x8769);

      if (exifIfdEntry) {
        const exifIfdOffset = readU32(
          tiffStart + ifd0Offset + 2 + 0, // re-read from tag entry
        );
        // We need the raw offset stored in the entry value field
        const rawExifOffset = littleEndian
          ? imageBuffer.readUInt32LE(exifIfdEntry.valueOffset)
          : imageBuffer.readUInt32BE(exifIfdEntry.valueOffset);
        const exifIfd = this.parseIfd(imageBuffer, rawExifOffset, tiffStart, littleEndian);

        // Tag 0x9003: DateTimeOriginal  e.g. "2024:07:13 10:30:00"
        const dtoEntry = exifIfd.get(0x9003);

        if (dtoEntry) {
          const str = this.readAsciiString(
            imageBuffer,
            dtoEntry.valueOffset,
            Math.min(dtoEntry.count, 20),
          );

          // "YYYY:MM:DD HH:mm:ss" → ISO
          const iso = str.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
          const parsed = new Date(iso);

          if (!isNaN(parsed.getTime())) {
            dateTimeOriginal = parsed;
          }
        }
      }

      // Tag 0x8825: GPS IFD pointer
      const gpsIfdEntry = ifd0.get(0x8825);

      if (gpsIfdEntry) {
        const rawGpsOffset = littleEndian
          ? imageBuffer.readUInt32LE(gpsIfdEntry.valueOffset)
          : imageBuffer.readUInt32BE(gpsIfdEntry.valueOffset);
        const gpsIfd = this.parseIfd(imageBuffer, rawGpsOffset, tiffStart, littleEndian);

        // Tag 0x0001: GPSLatitudeRef (N/S), Tag 0x0002: GPSLatitude
        const latRefEntry = gpsIfd.get(0x0001);
        const latEntry = gpsIfd.get(0x0002);

        if (latRefEntry && latEntry) {
          const latRef = imageBuffer
            .subarray(latRefEntry.valueOffset, latRefEntry.valueOffset + 1)
            .toString('ascii');
          const lat = this.gpsToDecimal(
            imageBuffer,
            latEntry.valueOffset,
            littleEndian,
          );

          gpsLatitude = latRef === 'S' ? -lat : lat;
        }

        // Tag 0x0003: GPSLongitudeRef (E/W), Tag 0x0004: GPSLongitude
        const lonRefEntry = gpsIfd.get(0x0003);
        const lonEntry = gpsIfd.get(0x0004);

        if (lonRefEntry && lonEntry) {
          const lonRef = imageBuffer
            .subarray(lonRefEntry.valueOffset, lonRefEntry.valueOffset + 1)
            .toString('ascii');
          const lon = this.gpsToDecimal(
            imageBuffer,
            lonEntry.valueOffset,
            littleEndian,
          );

          gpsLongitude = lonRef === 'W' ? -lon : lon;
        }
      }

      return {
        dateTimeOriginal,
        gpsLatitude,
        gpsLongitude,
        hasMissingMetadata:
          dateTimeOriginal === null &&
          gpsLatitude === null &&
          gpsLongitude === null,
      };
    } catch (error) {
      this.logger.debug('EXIF extraction failed', error);

      return empty;
    }
  }
}
