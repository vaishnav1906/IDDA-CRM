import { Command } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { FieldMetadataEntity } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { WorkspaceMetadataVersionService } from 'src/engine/metadata-modules/workspace-metadata-version/services/workspace-metadata-version.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

const LEAD_UNIVERSAL_IDENTIFIER = STANDARD_OBJECTS.lead.universalIdentifier;
const SPECIALIZATION_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.lead.fields.specialization.universalIdentifier;

const ENUM_TYPE_NAME = 'lead_specialization_enum';

const SPECIALIZATION_OPTIONS = [
  { id: 'a1b2c3d4-0001-4001-8001-000000000001', value: 'DENTIST', label: 'Dentist', position: 0, color: 'blue' },
  { id: 'a1b2c3d4-0002-4002-8002-000000000002', value: 'DERMATOLOGIST', label: 'Dermatologist', position: 1, color: 'sky' },
  { id: 'a1b2c3d4-0003-4003-8003-000000000003', value: 'PAEDIATRICIAN', label: 'Paediatrician', position: 2, color: 'green' },
  { id: 'a1b2c3d4-0004-4004-8004-000000000004', value: 'GENERAL_PHYSICIAN', label: 'General Physician', position: 3, color: 'turquoise' },
  { id: 'a1b2c3d4-0005-4005-8005-000000000005', value: 'ENT', label: 'ENT', position: 4, color: 'purple' },
  { id: 'a1b2c3d4-0006-4006-8006-000000000006', value: 'COSMETOLOGIST', label: 'Cosmetologist', position: 5, color: 'pink' },
  { id: 'a1b2c3d4-0007-4007-8007-000000000007', value: 'PLASTIC_SURGEON', label: 'Plastic Surgeon', position: 6, color: 'red' },
  { id: 'a1b2c3d4-0008-4008-8008-000000000008', value: 'TRICHOLOGIST', label: 'Trichologist', position: 7, color: 'yellow' },
  { id: 'a1b2c3d4-0009-4009-8009-000000000009', value: 'HOSPITAL', label: 'Hospital', position: 8, color: 'orange' },
  { id: 'a1b2c3d4-000a-400a-800a-00000000000a', value: 'CLINIC', label: 'Clinic', position: 9, color: 'gray' },
  { id: 'a1b2c3d4-000b-400b-800b-00000000000b', value: 'OTHER', label: 'Other', position: 10, color: 'gray' },
] as const;

// Maps raw text values (lower-cased) to SELECT enum values.
// Unrecognized values fall back to OTHER.
const TEXT_TO_ENUM_MAP: Record<string, string> = {
  dentist: 'DENTIST',
  dermatologist: 'DERMATOLOGIST',
  paediatrician: 'PAEDIATRICIAN',
  pediatrician: 'PAEDIATRICIAN',
  'general physician': 'GENERAL_PHYSICIAN',
  'general practitioner': 'GENERAL_PHYSICIAN',
  doctor: 'GENERAL_PHYSICIAN',
  ent: 'ENT',
  cosmetologist: 'COSMETOLOGIST',
  'skin care clinic': 'COSMETOLOGIST',
  'plastic surgeon': 'PLASTIC_SURGEON',
  trichologist: 'TRICHOLOGIST',
  'hair transplantation clinic': 'TRICHOLOGIST',
  hospital: 'HOSPITAL',
  clinic: 'CLINIC',
  other: 'OTHER',
};

@RegisteredWorkspaceCommand('2.17.0', 1801000030000)
@Command({
  name: 'upgrade:2-17:lead-specialization-text-to-select',
  description:
    'Convert Lead.specialization from TEXT to SELECT (colored badge field) on all existing workspaces, migrating existing text values to the closest enum option.',
})
export class LeadSpecializationTextToSelectCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceMetadataVersionService: WorkspaceMetadataVersionService,
    @InjectRepository(FieldMetadataEntity)
    private readonly fieldMetadataRepository: Repository<FieldMetadataEntity>,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    dataSource,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    if (!isDefined(dataSource)) {
      this.logger.log(
        `No data source for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatObjectMetadataMaps',
        'flatFieldMetadataMaps',
      ]);

    const leadObject = findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
      flatEntityMaps: flatObjectMetadataMaps,
      universalIdentifier: LEAD_UNIVERSAL_IDENTIFIER,
    });

    if (!isDefined(leadObject)) {
      this.logger.log(
        `Lead object not found for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const specializationField =
      findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        flatEntityMaps: flatFieldMetadataMaps,
        universalIdentifier: SPECIALIZATION_UNIVERSAL_IDENTIFIER,
      });

    if (!isDefined(specializationField)) {
      this.logger.log(
        `specialization field not found for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (specializationField.type === FieldMetadataType.SELECT) {
      this.logger.log(
        `specialization is already SELECT for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);
    const tableName = 'lead';

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would convert lead.specialization TEXT → SELECT in schema ${schemaName} for workspace ${workspaceId}`,
      );

      return;
    }

    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const enumValues = SPECIALIZATION_OPTIONS.map((o) => o.value);

      // Step 1 — Normalise existing text values into the enum value set.
      // Do this BEFORE converting the column type so we can use plain text UPDATE.
      for (const option of SPECIALIZATION_OPTIONS) {
        const textValues = Object.entries(TEXT_TO_ENUM_MAP)
          .filter(([, enumVal]) => enumVal === option.value)
          .map(([textVal]) => textVal);

        if (textValues.length > 0) {
          await queryRunner.query(
            `UPDATE "${schemaName}"."${tableName}"
             SET "specialization" = $1
             WHERE LOWER("specialization") = ANY($2::text[])`,
            [option.value, textValues],
          );
        }
      }

      // Step 2 — Any remaining unrecognized values → 'OTHER'.
      await queryRunner.query(
        `UPDATE "${schemaName}"."${tableName}"
         SET "specialization" = 'OTHER'
         WHERE "specialization" IS NOT NULL
           AND "specialization" NOT IN (${enumValues.map((_, i) => `$${i + 1}`).join(', ')})`,
        enumValues,
      );

      // Step 3 — Create the Postgres ENUM type (if it doesn't already exist).
      const enumTypeExists: { exists: boolean }[] = await queryRunner.query(
        `SELECT EXISTS (
           SELECT 1 FROM pg_type pt
           JOIN pg_namespace pn ON pn.oid = pt.typnamespace
           WHERE pn.nspname = $1 AND pt.typname = $2
         ) AS exists`,
        [schemaName, ENUM_TYPE_NAME],
      );

      if (!enumTypeExists[0]?.exists) {
        const enumLiteral = enumValues
          .map((v) => `'${v}'`)
          .join(', ');
        await queryRunner.query(
          `CREATE TYPE "${schemaName}"."${ENUM_TYPE_NAME}" AS ENUM (${enumLiteral})`,
        );
      }

      // Step 4 — Alter the column to use the enum type.
      await queryRunner.query(
        `ALTER TABLE "${schemaName}"."${tableName}"
         ALTER COLUMN "specialization"
         TYPE "${schemaName}"."${ENUM_TYPE_NAME}"
         USING "specialization"::"${schemaName}"."${ENUM_TYPE_NAME}"`,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Schema migration failed for workspace ${workspaceId}: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Step 5 — Update the fieldMetadata record in the core schema.
    await this.fieldMetadataRepository.update(
      { id: specializationField.id, workspaceId },
      {
        type: FieldMetadataType.SELECT,
        options: SPECIALIZATION_OPTIONS as unknown as typeof specializationField.options,
      },
    );

    // Step 6 — Invalidate the workspace cache so the server serves fresh metadata.
    await this.workspaceMetadataVersionService.incrementMetadataVersion(
      workspaceId,
    );

    this.logger.log(
      `Converted lead.specialization TEXT → SELECT for workspace ${workspaceId}`,
    );
  }
}
