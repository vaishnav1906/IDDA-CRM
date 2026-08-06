import { Command } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type FlatNavigationMenuItem } from 'src/engine/metadata-modules/flat-navigation-menu-item/types/flat-navigation-menu-item.type';
import { NavigationMenuItemType } from 'src/engine/metadata-modules/navigation-menu-item/enums/navigation-menu-item-type.enum';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// Object names that belong to demo/seed data and should not appear in the
// IDDA CRM sidebar. Matched against objectMetadata.nameSingular.
const DEMO_OBJECT_NAMES = new Set([
  'pet',
  'rocket',
  'surveyResult',
  'employmentHistory',
  'petCareAgreement',
]);

@RegisteredWorkspaceCommand('2.17.0', 1801000040000)
@Command({
  name: 'upgrade:2-17:remove-demo-nav-items',
  description:
    'Remove demo/seed navigation menu items (Pets, Rockets, Survey Results, Employment Histories, Pet Care Agreements, Star History) from the IDDA CRM workspace sidebar.',
})
export class RemoveDemoNavItemsCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
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

    const { flatNavigationMenuItemMaps, flatObjectMetadataMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatNavigationMenuItemMaps',
        'flatObjectMetadataMaps',
      ]);

    // Build an index of objectMetadataId → nameSingular for fast lookups.
    // universalIdentifierById: objectId → universalIdentifier
    // byUniversalIdentifier: universalIdentifier → FlatObjectMetadata
    const idToObjectName = new Map<string, string>(
      Object.entries(flatObjectMetadataMaps.universalIdentifierById)
        .filter((entry): entry is [string, string] => isDefined(entry[1]))
        .flatMap(([objId, uid]) => {
          const obj = flatObjectMetadataMaps.byUniversalIdentifier[uid];

          return isDefined(obj) ? [[objId, obj.nameSingular]] : [];
        }),
    );

    const itemsToDelete: FlatNavigationMenuItem[] = Object.values(
      flatNavigationMenuItemMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter((item) => {
        // OBJECT type: match by object name
        if (item.type === NavigationMenuItemType.OBJECT) {
          if (!isDefined(item.targetObjectMetadataId)) return false;
          const objName = idToObjectName.get(item.targetObjectMetadataId);

          return isDefined(objName) && DEMO_OBJECT_NAMES.has(objName);
        }

        // PAGE_LAYOUT type: match "Star History" by name
        if (item.type === NavigationMenuItemType.PAGE_LAYOUT) {
          return item.name === 'Star History';
        }

        return false;
      });

    if (itemsToDelete.length === 0) {
      this.logger.log(
        `No demo navigation items found for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const labels = itemsToDelete.map((item) => {
      if (item.type === NavigationMenuItemType.OBJECT && isDefined(item.targetObjectMetadataId)) {
        return idToObjectName.get(item.targetObjectMetadataId) ?? item.id;
      }

      return item.name ?? item.id;
    });

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would remove ${itemsToDelete.length} demo nav item(s) for workspace ${workspaceId}: ${labels.join(', ')}`,
      );

      return;
    }

    const result =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            navigationMenuItem: {
              flatEntityToCreate: [],
              flatEntityToDelete: itemsToDelete,
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
        `Failed to remove demo nav items for workspace ${workspaceId}: ${JSON.stringify(result.report)}`,
      );
      throw new Error(
        `Migration failed for workspace ${workspaceId}: ${JSON.stringify(result.report)}`,
      );
    }

    this.logger.log(
      `Removed ${itemsToDelete.length} demo nav item(s) from workspace ${workspaceId}: ${labels.join(', ')}`,
    );
  }
}
