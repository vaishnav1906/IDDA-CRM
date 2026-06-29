import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import Papa from 'papaparse';

import { MedleadsImportExceptionCode } from 'src/modules/lead/exceptions/medleads-import-exception-code.enum';
import { MedleadsImportException } from 'src/modules/lead/exceptions/medleads-import.exception';
import { type MedleadsImportRowDto } from 'src/modules/lead/dtos/medleads-import-row.dto';

// Maps every CSV column header variant (case-insensitive) to our internal field name.
const HEADER_ALIASES: Record<string, keyof MedleadsImportRowDto> = {
  'clinic name': 'clinicName',
  clinicname: 'clinicName',
  clinic: 'clinicName',
  'doctor name': 'doctorName',
  doctorname: 'doctorName',
  doctor: 'doctorName',
  phone: 'phone',
  'phone number': 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  address: 'address',
  town: 'town',
  city: 'city',
  state: 'state',
  category: 'category',
  specialization: 'specialization',
  specialisation: 'specialization',
  rating: 'rating',
  reviews: 'reviews',
  'review count': 'reviews',
  reviewcount: 'reviews',
  website: 'website',
  'website url': 'website',
  websiteurl: 'website',
  'maps url': 'mapsUrl',
  mapsurl: 'mapsUrl',
  'google maps url': 'mapsUrl',
  googlemapsurl: 'mapsUrl',
  'maps link': 'mapsUrl',
  source: 'source',
  'imported at': 'importedAt',
  importedat: 'importedAt',
  'extracted at': 'extractedAt',
  extractedat: 'extractedAt',
};

@Injectable()
export class MedleadsCsvParserService {
  parse(buffer: Buffer): MedleadsImportRowDto[] {
    const csvString = buffer.toString('utf-8');

    if (!isNonEmptyString(csvString.trim())) {
      throw new MedleadsImportException(
        'Uploaded CSV file is empty',
        MedleadsImportExceptionCode.EMPTY_FILE,
      );
    }

    const result = Papa.parse<Record<string, string>>(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (result.errors.length > 0) {
      const firstError = result.errors[0];

      throw new MedleadsImportException(
        `CSV parse error at row ${firstError.row ?? 'unknown'}: ${firstError.message}`,
        MedleadsImportExceptionCode.PARSE_ERROR,
      );
    }

    if (result.data.length === 0) {
      throw new MedleadsImportException(
        'CSV file contains no data rows',
        MedleadsImportExceptionCode.EMPTY_FILE,
      );
    }

    return result.data.map((rawRow) => this.normaliseRow(rawRow));
  }

  private normaliseRow(
    rawRow: Record<string, string>,
  ): MedleadsImportRowDto {
    const normalised: Partial<MedleadsImportRowDto> = {};

    for (const [key, value] of Object.entries(rawRow)) {
      const internalKey = HEADER_ALIASES[key.toLowerCase().trim()];

      if (internalKey !== undefined && isNonEmptyString(value?.trim())) {
        normalised[internalKey] = value.trim();
      }
    }

    return normalised as MedleadsImportRowDto;
  }
}
