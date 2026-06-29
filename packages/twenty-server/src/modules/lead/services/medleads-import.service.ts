import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { In, type FindOperator } from 'typeorm';
import { FieldActorSource } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import {
  type MedleadsFailedRowDto,
  type MedleadsImportRowDto,
  type MedleadsValidatedRowDto,
} from 'src/modules/lead/dtos/medleads-import-row.dto';
import { type MedleadsImportResultDto } from 'src/modules/lead/dtos/medleads-import-result.dto';
import { MedleadsImportExceptionCode } from 'src/modules/lead/exceptions/medleads-import-exception-code.enum';
import { MedleadsImportException } from 'src/modules/lead/exceptions/medleads-import.exception';
import { MedleadsCsvParserService } from 'src/modules/lead/services/medleads-csv-parser.service';
import { MedleadsRowValidatorService } from 'src/modules/lead/services/medleads-row-validator.service';
import { LeadWorkspaceEntity } from 'src/modules/lead/standard-objects/lead.workspace-entity';

type DeduplicateKey =
  | { field: 'mapsUrl'; value: string }
  | { field: 'clinicNamePhone'; clinicName: string; phone: string }
  | { field: 'clinicNameCity'; clinicName: string; city: string };

@Injectable()
export class MedleadsImportService {
  private readonly logger = new Logger(MedleadsImportService.name);

  constructor(
    private readonly csvParserService: MedleadsCsvParserService,
    private readonly rowValidatorService: MedleadsRowValidatorService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async importFromBuffer(
    fileBuffer: Buffer,
  ): Promise<MedleadsImportResultDto> {
    const authContext = getWorkspaceAuthContext();
    const workspaceId = authContext.workspace.id;

    let rawRows: MedleadsImportRowDto[];

    try {
      rawRows = this.csvParserService.parse(fileBuffer);
    } catch (error) {
      throw error;
    }

    const validatedRows: MedleadsValidatedRowDto[] = [];
    const failedRows: MedleadsFailedRowDto[] = [];

    for (const [index, rawRow] of rawRows.entries()) {
      const result = this.rowValidatorService.validate(rawRow);

      if (result.isValid) {
        validatedRows.push(result.row);
      } else {
        failedRows.push({
          rowIndex: index + 2, // +2: 1-indexed, header is row 1
          rawRow: rawRow as Record<string, string>,
          reason: result.reason,
        });
      }
    }

    if (validatedRows.length === 0 && rawRows.length > 0) {
      return { imported: 0, skipped: 0, failed: failedRows.length, failedRows };
    }

    try {
      const { imported, skipped } =
        await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
          async () => {
            const leadRepository =
              await this.globalWorkspaceOrmManager.getRepository<LeadWorkspaceEntity>(
                workspaceId,
                'lead',
                { shouldBypassPermissionChecks: true },
              );

            const existingKeys = await this.fetchExistingKeys(
              leadRepository,
              validatedRows,
            );

            const rowsToInsert: MedleadsValidatedRowDto[] = [];
            let skippedCount = 0;

            for (const row of validatedRows) {
              if (this.isDuplicate(row, existingKeys)) {
                skippedCount++;
              } else {
                rowsToInsert.push(row);
              }
            }

            if (rowsToInsert.length > 0) {
              const now = new Date();
              const actor = {
                source: FieldActorSource.IMPORT,
                workspaceMemberId: null,
                name: 'MedLeads Import',
                context: {},
              };

              const entities = rowsToInsert.map((row) =>
                this.toWorkspaceEntity(row, actor, now),
              );

              await leadRepository.save(entities);
            }

            return { imported: rowsToInsert.length, skipped: skippedCount };
          },
          authContext,
        );

      return { imported, skipped, failed: failedRows.length, failedRows };
    } catch (error) {
      this.logger.error('MedLeads import failed', { error, workspaceId });

      throw new MedleadsImportException(
        `Import failed: ${error instanceof Error ? error.message : String(error)}`,
        MedleadsImportExceptionCode.IMPORT_FAILED,
      );
    }
  }

  // Fetches all existing lead records that match any dedup key from the batch.
  // Uses three separate queries (one per strategy) and collects the result sets.
  private async fetchExistingKeys(
    leadRepository: WorkspaceRepository<LeadWorkspaceEntity>,
    rows: MedleadsValidatedRowDto[],
  ): Promise<{
    mapsUrls: Set<string>;
    clinicNamePhones: Set<string>;
    clinicNameCities: Set<string>;
  }> {
    const mapsUrls = new Set<string>();
    const clinicNamePhones = new Set<string>();
    const clinicNameCities = new Set<string>();

    const mapsUrlValues = rows
      .map((row) => row.mapsUrl)
      .filter(isDefined)
      .filter(Boolean);

    if (mapsUrlValues.length > 0) {
      const existing = await leadRepository.find({
        select: ['mapsUrl'],
        where: { mapsUrl: In(mapsUrlValues) as unknown as FindOperator<string> },
      });

      for (const lead of existing) {
        if (isDefined(lead.mapsUrl)) {
          mapsUrls.add(String(lead.mapsUrl));
        }
      }
    }

    const clinicPhoneRows = rows.filter(
      (row) => !row.mapsUrl && isNonEmptyString(row.clinicName) && isNonEmptyString(row.phone),
    );

    if (clinicPhoneRows.length > 0) {
      const clinicNames = clinicPhoneRows.map((row) => row.clinicName);
      const phones = clinicPhoneRows.map((row) => row.phone as string);

      const existing = await leadRepository.find({
        select: ['clinicName', 'phone'],
        where: {
          clinicName: In(clinicNames) as unknown as FindOperator<string>,
          phone: In(phones) as unknown as FindOperator<string>,
        },
      });

      for (const lead of existing) {
        if (isNonEmptyString(lead.clinicName) && isNonEmptyString(lead.phone)) {
          clinicNamePhones.add(`${lead.clinicName}|${lead.phone}`);
        }
      }
    }

    const clinicCityRows = rows.filter(
      (row) =>
        !row.mapsUrl &&
        !(isNonEmptyString(row.clinicName) && isNonEmptyString(row.phone)) &&
        isNonEmptyString(row.clinicName) &&
        isNonEmptyString(row.city),
    );

    if (clinicCityRows.length > 0) {
      const clinicNames = clinicCityRows.map((row) => row.clinicName);
      const cities = clinicCityRows.map((row) => row.city as string);

      const existing = await leadRepository.find({
        select: ['clinicName', 'city'],
        where: {
          clinicName: In(clinicNames) as unknown as FindOperator<string>,
          city: In(cities) as unknown as FindOperator<string>,
        },
      });

      for (const lead of existing) {
        if (isNonEmptyString(lead.clinicName) && isNonEmptyString(lead.city)) {
          clinicNameCities.add(`${lead.clinicName}|${lead.city}`);
        }
      }
    }

    return { mapsUrls, clinicNamePhones, clinicNameCities };
  }

  private isDuplicate(
    row: MedleadsValidatedRowDto,
    existingKeys: {
      mapsUrls: Set<string>;
      clinicNamePhones: Set<string>;
      clinicNameCities: Set<string>;
    },
  ): boolean {
    if (isNonEmptyString(row.mapsUrl)) {
      return existingKeys.mapsUrls.has(row.mapsUrl as string);
    }

    if (isNonEmptyString(row.clinicName) && isNonEmptyString(row.phone)) {
      return existingKeys.clinicNamePhones.has(
        `${row.clinicName}|${row.phone}`,
      );
    }

    if (isNonEmptyString(row.clinicName) && isNonEmptyString(row.city)) {
      return existingKeys.clinicNameCities.has(
        `${row.clinicName}|${row.city}`,
      );
    }

    return false;
  }

  private toWorkspaceEntity(
    row: MedleadsValidatedRowDto,
    actor: { source: FieldActorSource; workspaceMemberId: null; name: string; context: object },
    now: Date,
  ): Partial<LeadWorkspaceEntity> {
    return {
      clinicName: row.clinicName,
      doctorName: row.doctorName,
      phone: row.phone,
      address: row.address,
      town: row.town,
      city: row.city,
      state: row.state,
      category: row.category,
      specialization: row.specialization,
      rating: row.rating,
      reviews: row.reviews,
      website: row.website
        ? { primaryLinkLabel: '', primaryLinkUrl: row.website, secondaryLinks: null }
        : null,
      mapsUrl: row.mapsUrl
        ? { primaryLinkLabel: '', primaryLinkUrl: row.mapsUrl, secondaryLinks: null }
        : null,
      source: row.source,
      importedAt: row.importedAt ?? now,
      extractedAt: row.extractedAt,
      status: 'NEW',
      createdBy: actor,
      updatedBy: actor,
    };
  }
}

