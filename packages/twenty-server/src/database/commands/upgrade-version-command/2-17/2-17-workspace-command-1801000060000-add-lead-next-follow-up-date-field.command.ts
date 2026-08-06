import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { DateDisplayFormat, FieldMetadataType } from 'twenty-shared/types';
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

const LEAD_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.lead.universalIdentifier;

const NEXT_FOLLOW_UP_DATE_FIELD_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.lead.fields.nextFollowUpDate.universalIdentifier;

@RegisteredWorkspaceCommand('2.17.0', 1801000060000)
@Command({
  name: 'upgrade:2-17:add-lead-next-follow-up-date-field',
  description:
    'Add nextFollowUpDate DateTime field to the Lead object on all existing workspaces.',
})
export class AddLeadNextFollowUpDateFieldCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
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

    const leadObject =
      findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
        flatEntityMaps: flatObjectMetadataMaps,
        universalIdentifier: LEAD_UNIVERSAL_IDENTIFIER,
      });

    if (!isDefined(leadObject)) {
      this.logger.log(
        `lead object not found for workspace ${workspaceId}, skipping`,
      );
      return;
    }

    const existingField =
      findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        flatEntityMaps: flatFieldMetadataMaps,
        universalIdentifier: NEXT_FOLLOW_UP_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      });

    if (isDefined(existingField)) {
      this.logger.log(
        `nextFollowUpDate field already present on lead for workspace ${workspaceId}, skipping`,
      );
      return;
    }

    const createFieldInput: Omit<CreateFieldInput, 'workspaceId'> = {
      objectMetadataId: leadObject.id,
      name: 'nextFollowUpDate',
      type: FieldMetadataType.DATE_TIME,
      label: 'Next Follow-Up Date',
      description: 'Scheduled date for the next follow-up action on this lead',
      icon: 'IconCalendarCheck',
      isNullable: true,
      isActive: true,
      universalIdentifier: NEXT_FOLLOW_UP_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      settings: {
        displayFormat: DateDisplayFormat.RELATIVE,
      },
    };

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would create nextFollowUpDate field on lead for workspace ${workspaceId}`,
      );
      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    try {
      await this.fieldMetadataService.createManyFields({
        createFieldInputs: [createFieldInput],
        workspaceId,
        ownerFlatApplication: twentyStandardFlatApplication,
        isSystemBuild: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to add nextFollowUpDate field on lead for workspace ${workspaceId}:\n${
          error instanceof Error ? error.stack : JSON.stringify(error, null, 2)
        }`,
      );
      throw error;
    }

    this.logger.log(
      `Added nextFollowUpDate field on lead for workspace ${workspaceId}`,
    );
  }
}
