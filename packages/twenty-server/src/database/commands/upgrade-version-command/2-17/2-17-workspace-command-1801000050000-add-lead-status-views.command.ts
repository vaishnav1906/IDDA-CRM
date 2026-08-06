import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatNavigationMenuItem } from 'src/engine/metadata-modules/flat-navigation-menu-item/types/flat-navigation-menu-item.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatViewFilter } from 'src/engine/metadata-modules/flat-view-filter/types/flat-view-filter.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';

// These UUIDs are frozen here because the constants were removed when the
// interestedLeads/followUpLeads nav items were retired (command 1801000070000).
const INTERESTED_LEADS_NAV_ITEM_UNIVERSAL_IDENTIFIER =
  '88a6cc28-197c-4540-914e-9d2c539d2148';

const INTERESTED_LEADS_VIEW_UNIVERSAL_IDENTIFIER =
  '27ee886e-25f2-4602-8d81-89a34031d4e2';

const FOLLOW_UP_LEADS_VIEW_UNIVERSAL_IDENTIFIER =
  'e03bea92-778e-41b3-9690-3f817ed2ad81';

const FOLLOW_UP_LEADS_NAV_ITEM_UNIVERSAL_IDENTIFIER =
  '17c6d238-e412-4616-8a2e-b88be5dc9c29';

const LEAD_STATUS_FIELD_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.lead.fields.status.universalIdentifier;

const FOLLOW_UP_NEEDED_OPTION = {
  id: 'f3c4d5e6-1234-5678-abcd-ef0000000001',
  value: 'FOLLOW_UP_NEEDED',
  label: 'Follow-up Needed',
  position: 7,
  color: 'orange',
} as const;

@RegisteredWorkspaceCommand('2.17.0', 1801000050000)
@Command({
  name: 'upgrade:2-17:add-lead-status-views',
  description:
    'Add Interested Leads and Follow-up Leads filtered views, their nav items, and the FOLLOW_UP_NEEDED status option to the Lead object on all existing workspaces.',
})
export class AddLeadStatusViewsCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const { flatNavigationMenuItemMaps, flatFieldMetadataMaps, flatViewMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatNavigationMenuItemMaps',
        'flatFieldMetadataMaps',
        'flatViewMaps',
      ]);

    // Check idempotency — skip if interestedLeads nav item already exists
    const existingInterestedNavItem =
      findFlatEntityByUniversalIdentifier<FlatNavigationMenuItem>({
        flatEntityMaps: flatNavigationMenuItemMaps,
        universalIdentifier: INTERESTED_LEADS_NAV_ITEM_UNIVERSAL_IDENTIFIER,
      });

    if (isDefined(existingInterestedNavItem)) {
      this.logger.log(
        `interestedLeads nav item already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would create interestedLeads and followUpLeads views, view fields, view filters, and nav items for workspace ${workspaceId}`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const now = new Date().toISOString();

    const { allFlatEntityMaps } =
      computeTwentyStandardApplicationAllFlatEntityMaps({
        now,
        workspaceId,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
      });

    // --- Views ---
    const existingInterestedView = findFlatEntityByUniversalIdentifier<FlatView>(
      {
        flatEntityMaps: flatViewMaps,
        universalIdentifier: INTERESTED_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
      },
    );

    const existingFollowUpView = findFlatEntityByUniversalIdentifier<FlatView>({
      flatEntityMaps: flatViewMaps,
      universalIdentifier: FOLLOW_UP_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    });

    const interestedLeadsView = findFlatEntityByUniversalIdentifier<FlatView>({
      flatEntityMaps: allFlatEntityMaps.flatViewMaps,
      universalIdentifier: INTERESTED_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    });

    const followUpLeadsView = findFlatEntityByUniversalIdentifier<FlatView>({
      flatEntityMaps: allFlatEntityMaps.flatViewMaps,
      universalIdentifier: FOLLOW_UP_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    });

    if (!isDefined(interestedLeadsView) || !isDefined(followUpLeadsView)) {
      this.logger.error(
        `interestedLeads or followUpLeads view not found in standard application for workspace ${workspaceId}`,
      );

      return;
    }

    // --- View fields ---
    const interestedLeadsViewFields = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    ).filter(
      (vf): vf is NonNullable<typeof vf> =>
        isDefined(vf) &&
        vf.viewUniversalIdentifier === INTERESTED_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    );

    const followUpLeadsViewFields = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    ).filter(
      (vf): vf is NonNullable<typeof vf> =>
        isDefined(vf) &&
        vf.viewUniversalIdentifier === FOLLOW_UP_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    );

    // --- View filters ---
    const interestedLeadsViewFilters = Object.values(
      allFlatEntityMaps.flatViewFilterMaps.byUniversalIdentifier,
    ).filter(
      (vf): vf is NonNullable<typeof vf> =>
        isDefined(vf) &&
        vf.viewUniversalIdentifier === INTERESTED_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    );

    const followUpLeadsViewFilters = Object.values(
      allFlatEntityMaps.flatViewFilterMaps.byUniversalIdentifier,
    ).filter(
      (vf): vf is NonNullable<typeof vf> =>
        isDefined(vf) &&
        vf.viewUniversalIdentifier === FOLLOW_UP_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    );

    // --- Nav items ---
    const interestedLeadsNavItem =
      findFlatEntityByUniversalIdentifier<FlatNavigationMenuItem>({
        flatEntityMaps: allFlatEntityMaps.flatNavigationMenuItemMaps,
        universalIdentifier: INTERESTED_LEADS_NAV_ITEM_UNIVERSAL_IDENTIFIER,
      });

    const followUpLeadsNavItem =
      findFlatEntityByUniversalIdentifier<FlatNavigationMenuItem>({
        flatEntityMaps: allFlatEntityMaps.flatNavigationMenuItemMaps,
        universalIdentifier: FOLLOW_UP_LEADS_NAV_ITEM_UNIVERSAL_IDENTIFIER,
      });

    if (!isDefined(interestedLeadsNavItem) || !isDefined(followUpLeadsNavItem)) {
      this.logger.error(
        `interestedLeads or followUpLeads nav item not found in standard application for workspace ${workspaceId}`,
      );

      return;
    }

    // --- Field metadata: add FOLLOW_UP_NEEDED option ---
    const statusField =
      flatFieldMetadataMaps.byUniversalIdentifier[
        LEAD_STATUS_FIELD_UNIVERSAL_IDENTIFIER
      ];

    const fieldMetadataToUpdate: FlatFieldMetadata[] = [];

    if (
      isDefined(statusField) &&
      statusField.type === FieldMetadataType.SELECT
    ) {
      const selectStatusField =
        statusField as FlatFieldMetadata<FieldMetadataType.SELECT>;
      const existingOptions = selectStatusField.options ?? [];
      const alreadyHasOption = existingOptions.some(
        (o) => o.value === FOLLOW_UP_NEEDED_OPTION.value,
      );

      if (!alreadyHasOption) {
        const updatedStatusField: FlatFieldMetadata<FieldMetadataType.SELECT> =
          {
            ...selectStatusField,
            options: [
              ...existingOptions,
              FOLLOW_UP_NEEDED_OPTION,
            ] as typeof selectStatusField.options,
            updatedAt: now,
          };

        fieldMetadataToUpdate.push(updatedStatusField);
      }
    }

    const viewsToCreate: FlatView[] = [
      ...(isDefined(existingInterestedView) ? [] : [interestedLeadsView]),
      ...(isDefined(existingFollowUpView) ? [] : [followUpLeadsView]),
    ];

    const viewFieldsToCreate: FlatViewField[] = [
      ...(isDefined(existingInterestedView) ? [] : interestedLeadsViewFields),
      ...(isDefined(existingFollowUpView) ? [] : followUpLeadsViewFields),
    ];

    const viewFiltersToCreate: FlatViewFilter[] = [
      ...(isDefined(existingInterestedView) ? [] : interestedLeadsViewFilters),
      ...(isDefined(existingFollowUpView) ? [] : followUpLeadsViewFilters),
    ];

    const result =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            view: {
              flatEntityToCreate: viewsToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
            viewField: {
              flatEntityToCreate: viewFieldsToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
            viewFilter: {
              flatEntityToCreate: viewFiltersToCreate,
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
            navigationMenuItem: {
              flatEntityToCreate: [interestedLeadsNavItem, followUpLeadsNavItem],
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
            ...(fieldMetadataToUpdate.length > 0
              ? {
                  fieldMetadata: {
                    flatEntityToCreate: [],
                    flatEntityToDelete: [],
                    flatEntityToUpdate: fieldMetadataToUpdate,
                  },
                }
              : {}),
          },
          workspaceId,
          isSystemBuild: true,
          applicationUniversalIdentifier:
            TWENTY_STANDARD_APPLICATION.universalIdentifier,
        },
      );

    if (result.status === 'fail') {
      this.logger.error(
        `Failed to create lead status views for workspace ${workspaceId}: ${JSON.stringify(result.report)}`,
      );
      throw new Error(
        `Migration failed for workspace ${workspaceId}: ${JSON.stringify(result.report)}`,
      );
    }

    this.logger.log(
      `Created interestedLeads and followUpLeads views (${viewsToCreate.length} view(s), ${viewFieldsToCreate.length} view field(s), ${viewFiltersToCreate.length} view filter(s)) and nav items for workspace ${workspaceId}`,
    );
  }
}
