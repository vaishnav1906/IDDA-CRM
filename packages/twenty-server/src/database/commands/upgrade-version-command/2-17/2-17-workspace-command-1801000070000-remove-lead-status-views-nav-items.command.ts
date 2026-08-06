import { Command } from 'nest-commander';
import { isDefined } from 'twenty-shared/utils';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type FlatNavigationMenuItem } from 'src/engine/metadata-modules/flat-navigation-menu-item/types/flat-navigation-menu-item.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const STALE_NAV_ITEM_UNIVERSAL_IDENTIFIERS = new Set([
  '88a6cc28-197c-4540-914e-9d2c539d2148', // interestedLeads
  '17c6d238-e412-4616-8a2e-b88be5dc9c29', // followUpLeads
]);

@RegisteredWorkspaceCommand('2.17.0', 1801000070000)
@Command({
  name: 'upgrade:2-17:remove-lead-status-views-nav-items',
  description:
    'Remove the interestedLeads and followUpLeads sidebar navigation items, leaving only the single allLeads entry.',
})
export class RemoveLeadStatusViewsNavItemsCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
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

    const { flatNavigationMenuItemMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatNavigationMenuItemMaps',
      ]);

    const itemsToDelete: FlatNavigationMenuItem[] = Object.values(
      flatNavigationMenuItemMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter((item) =>
        STALE_NAV_ITEM_UNIVERSAL_IDENTIFIERS.has(item.universalIdentifier),
      );

    if (itemsToDelete.length === 0) {
      this.logger.log(
        `No stale lead status nav items found for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would remove ${itemsToDelete.length} lead status nav item(s) for workspace ${workspaceId}`,
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
        `Failed to remove lead status nav items for workspace ${workspaceId}: ${JSON.stringify(result.report)}`,
      );
      throw new Error(
        `Migration failed for workspace ${workspaceId}: ${JSON.stringify(result.report)}`,
      );
    }

    this.logger.log(
      `Removed ${itemsToDelete.length} lead status nav item(s) from workspace ${workspaceId}`,
    );
  }
}
