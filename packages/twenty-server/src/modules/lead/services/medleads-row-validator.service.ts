import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';

import {
  type MedleadsImportRowDto,
  type MedleadsValidatedRowDto,
} from 'src/modules/lead/dtos/medleads-import-row.dto';

type ValidationResult =
  | { isValid: true; row: MedleadsValidatedRowDto }
  | { isValid: false; reason: string };

@Injectable()
export class MedleadsRowValidatorService {
  validate(row: MedleadsImportRowDto): ValidationResult {
    if (!isNonEmptyString(row.clinicName)) {
      return { isValid: false, reason: 'Missing required field: Clinic Name' };
    }

    const rating = this.parseOptionalNumber(row.rating);

    if (row.rating !== undefined && rating === null) {
      return {
        isValid: false,
        reason: `Invalid Rating value: "${row.rating}" is not a number`,
      };
    }

    if (rating !== null && (rating < 0 || rating > 5)) {
      return {
        isValid: false,
        reason: `Rating "${rating}" is out of range (must be 0–5)`,
      };
    }

    const reviews = this.parseOptionalNumber(row.reviews);

    if (row.reviews !== undefined && reviews === null) {
      return {
        isValid: false,
        reason: `Invalid Reviews value: "${row.reviews}" is not a number`,
      };
    }

    const importedAt = this.parseOptionalDate(row.importedAt);
    const extractedAt = this.parseOptionalDate(row.extractedAt);

    if (row.importedAt !== undefined && importedAt === null) {
      return {
        isValid: false,
        reason: `Invalid Imported At value: "${row.importedAt}" is not a valid date`,
      };
    }

    if (row.extractedAt !== undefined && extractedAt === null) {
      return {
        isValid: false,
        reason: `Invalid Extracted At value: "${row.extractedAt}" is not a valid date`,
      };
    }

    return {
      isValid: true,
      row: {
        clinicName: row.clinicName,
        doctorName: row.doctorName ?? null,
        phone: row.phone ?? null,
        address: row.address ?? null,
        town: row.town ?? null,
        city: row.city ?? null,
        state: row.state ?? null,
        category: row.category ?? null,
        specialization: row.specialization ?? null,
        rating,
        reviews,
        website: row.website ?? null,
        mapsUrl: row.mapsUrl ?? null,
        source: row.source ?? null,
        importedAt,
        extractedAt,
      },
    };
  }

  private parseOptionalNumber(value: string | undefined): number | null {
    if (!isNonEmptyString(value)) {
      return null;
    }

    const parsed = parseFloat(value);

    return isNaN(parsed) ? null : parsed;
  }

  private parseOptionalDate(value: string | undefined): Date | null {
    if (!isNonEmptyString(value)) {
      return null;
    }

    const parsed = new Date(value);

    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
