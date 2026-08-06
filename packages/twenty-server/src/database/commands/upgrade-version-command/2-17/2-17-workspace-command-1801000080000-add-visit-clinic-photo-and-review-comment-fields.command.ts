import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type CreateFieldInput } from 'src/engine/metadata-modules/field-metadata/dtos/create-field.input';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

const VISIT_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.visit.universalIdentifier;

const CLINIC_PHOTO_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.visit.fields.clinicPhoto.universalIdentifier;

const REVIEW_COMMENT_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.visit.fields.reviewComment.universalIdentifier;

@RegisteredWorkspaceCommand('2.17.0', 1801000080000)
@Command({
  name: 'upgrade:2-17:add-visit-clinic-photo-and-review-comment-fields',
  description:
    'Add clinicPhoto (TEXT) and reviewComment (TEXT) fields to the visit standard object for all existing workspaces.',
})
export class AddVisitClinicPhotoAndReviewCommentFieldsCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly fieldMetadataService: FieldMetadataService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatObjectMetadataMaps',
        'flatFieldMetadataMaps',
      ]);

    // Try universalIdentifier first, fall back to nameSingular lookup
    let visitObject =
      findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
        flatEntityMaps: flatObjectMetadataMaps,
        universalIdentifier: VISIT_UNIVERSAL_IDENTIFIER,
      });

    if (!isDefined(visitObject)) {
      visitObject =
        Object.values(flatObjectMetadataMaps.byUniversalIdentifier).find(
          (obj) => obj.nameSingular === 'visit',
        ) ?? null;
    }

    if (!isDefined(visitObject)) {
      this.logger.log(
        `visit object not found for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const fieldsToAdd: Omit<CreateFieldInput, 'workspaceId'>[] = [];

    // Check by universalIdentifier first, then fall back to field name on the visit object
    const allFieldsForVisit = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter((f) => f.objectMetadataId === visitObject.id);

    const existingClinicPhoto =
      findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        flatEntityMaps: flatFieldMetadataMaps,
        universalIdentifier: CLINIC_PHOTO_UNIVERSAL_IDENTIFIER,
      }) ?? allFieldsForVisit.find((f) => f.name === 'clinicPhoto');

    if (!isDefined(existingClinicPhoto)) {
      fieldsToAdd.push({
        objectMetadataId: visitObject.id,
        name: 'clinicPhoto',
        type: FieldMetadataType.TEXT,
        label: 'Clinic Photo',
        description: 'Stored path of the clinic exterior photo',
        icon: 'IconPhoto',
        isNullable: true,
        isActive: true,
        universalIdentifier: CLINIC_PHOTO_UNIVERSAL_IDENTIFIER,
      });
    } else {
      this.logger.log(
        `clinicPhoto field already present on visit for workspace ${workspaceId}, skipping`,
      );
    }

    const existingReviewComment =
      findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        flatEntityMaps: flatFieldMetadataMaps,
        universalIdentifier: REVIEW_COMMENT_UNIVERSAL_IDENTIFIER,
      }) ?? allFieldsForVisit.find((f) => f.name === 'reviewComment');

    if (!isDefined(existingReviewComment)) {
      fieldsToAdd.push({
        objectMetadataId: visitObject.id,
        name: 'reviewComment',
        type: FieldMetadataType.TEXT,
        label: 'Review Comment',
        description: 'Manager comment when approving or rejecting this visit',
        icon: 'IconMessage',
        isNullable: true,
        isActive: true,
        universalIdentifier: REVIEW_COMMENT_UNIVERSAL_IDENTIFIER,
      });
    } else {
      this.logger.log(
        `reviewComment field already present on visit for workspace ${workspaceId}, skipping`,
      );
    }

    if (fieldsToAdd.length === 0) {
      this.logger.log(
        `All fields already present on visit for workspace ${workspaceId}, nothing to do`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would add ${fieldsToAdd.map((f) => f.name).join(', ')} to visit for workspace ${workspaceId}`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    try {
      await this.fieldMetadataService.createManyFields({
        createFieldInputs: fieldsToAdd,
        workspaceId,
        ownerFlatApplication: twentyStandardFlatApplication,
        isSystemBuild: true,
      });

      this.logger.log(
        `Added ${fieldsToAdd.map((f) => f.name).join(', ')} to visit for workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add visit fields for workspace ${workspaceId}:\n${
          error instanceof Error ? error.stack : JSON.stringify(error, null, 2)
        }`,
      );
      throw error;
    }
  }
}
