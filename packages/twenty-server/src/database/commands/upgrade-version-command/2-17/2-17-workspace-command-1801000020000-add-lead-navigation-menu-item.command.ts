import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatNavigationMenuItem } from 'src/engine/metadata-modules/flat-navigation-menu-item/types/flat-navigation-menu-item.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { STANDARD_NAVIGATION_MENU_ITEMS } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-navigation-menu-item.constant';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';

const ALL_LEADS_VIEW_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECTS.lead.views.allLeads.universalIdentifier;

const ALL_LEADS_NAV_ITEM_UNIVERSAL_IDENTIFIER =
  STANDARD_NAVIGATION_MENU_ITEMS.allLeads.universalIdentifier;

@RegisteredWorkspaceCommand('2.17.0', 1801000020000)
@Command({
  name: 'upgrade:2-17:add-lead-navigation-menu-item',
  description:
    'Create the allLeads view, view fields, and sidebar navigation menu item for the Lead object on all existing workspaces.',
})
export class AddLeadNavigationMenuItemCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
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

    const { flatNavigationMenuItemMaps, flatViewMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatNavigationMenuItemMaps',
        'flatViewMaps',
      ]);

    const existingNavItem =
      findFlatEntityByUniversalIdentifier<FlatNavigationMenuItem>({
        flatEntityMaps: flatNavigationMenuItemMaps,
        universalIdentifier: ALL_LEADS_NAV_ITEM_UNIVERSAL_IDENTIFIER,
      });

    if (isDefined(existingNavItem)) {
      this.logger.log(
        `allLeads navigation menu item already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const existingView = findFlatEntityByUniversalIdentifier<FlatView>({
      flatEntityMaps: flatViewMaps,
      universalIdentifier: ALL_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    });

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would create allLeads view${isDefined(existingView) ? ' (view already exists)' : ''} and navigation menu item for workspace ${workspaceId}`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const now = new Date().toISOString();

    const { allFlatEntityMaps } = computeTwentyStandardApplicationAllFlatEntityMaps(
      {
        now,
        workspaceId,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
      },
    );

    const allLeadsView = findFlatEntityByUniversalIdentifier<FlatView>({
      flatEntityMaps: allFlatEntityMaps.flatViewMaps,
      universalIdentifier: ALL_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    });

    if (!isDefined(allLeadsView)) {
      this.logger.error(
        `allLeads view not found in standard application for workspace ${workspaceId} — check standard-object.constant.ts`,
      );

      return;
    }

    const allLeadsNavItem =
      findFlatEntityByUniversalIdentifier<FlatNavigationMenuItem>({
        flatEntityMaps: allFlatEntityMaps.flatNavigationMenuItemMaps,
        universalIdentifier: ALL_LEADS_NAV_ITEM_UNIVERSAL_IDENTIFIER,
      });

    if (!isDefined(allLeadsNavItem)) {
      this.logger.error(
        `allLeads nav item not found in standard application for workspace ${workspaceId} — check standard-navigation-menu-item.constant.ts`,
      );

      return;
    }

    const allLeadsViewFields = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    ).filter(
      (viewField): viewField is NonNullable<typeof viewField> =>
        isDefined(viewField) &&
        viewField.viewUniversalIdentifier === ALL_LEADS_VIEW_UNIVERSAL_IDENTIFIER,
    );

    const viewsToCreate: FlatView[] = isDefined(existingView)
      ? []
      : [allLeadsView];

    const viewFieldsToCreate: FlatViewField[] = isDefined(existingView)
      ? []
      : allLeadsViewFields;

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
            navigationMenuItem: {
              flatEntityToCreate: [allLeadsNavItem],
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
          },
          workspaceId,
          isSystemBuild: true,
          applicationUniversalIdentifier:
            TWENTY_STANDARD_APPLICATION.universalIdentifier,
        },
      );

    if (result.status === 'fail') {
      this.logger.error(
        `Failed to create allLeads view/nav item for workspace ${workspaceId}: ${JSON.stringify(result.report)}`,
      );
      throw new Error(
        `Migration failed for workspace ${workspaceId}: ${JSON.stringify(result.report)}`,
      );
    }

    this.logger.log(
      `Created allLeads view (${viewsToCreate.length} view(s), ${viewFieldsToCreate.length} view field(s)) and navigation menu item for workspace ${workspaceId}`,
    );
  }
}
