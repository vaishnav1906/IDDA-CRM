import { Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { EmployeeExitHandoffService } from 'src/modules/employee-exit-handoff/services/employee-exit-handoff.service';
import { EXIT_EMPLOYMENT_STATUSES } from 'src/modules/employee-exit-handoff/constants/exit-handoff.constants';

/**
 * Handles bulk team record updates (e.g. mass termination via CSV import).
 * Enqueues one handoff job per team member whose new employmentStatus array
 * contains an exit value.
 */
@WorkspaceQueryHook({
  key: 'team.updateMany',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class TeamEmploymentStatusUpdateManyPostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(
    TeamEmploymentStatusUpdateManyPostQueryHook.name,
  );

  constructor(
    private readonly employeeExitHandoffService: EmployeeExitHandoffService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: any | any[],
  ): Promise<void> {
    const records = Array.isArray(payload) ? payload : [payload];

    if (records.length === 0) return;

    const workspaceId = authContext.workspace.id;
    const actorWorkspaceMemberId =
      authContext.type === 'user' ? authContext.workspaceMemberId : null;

    for (const record of records) {
      if (!isDefined(record?.id)) continue;

      const employmentStatus: string[] =
        (record.employmentStatus as string[] | null) ?? [];

      const hasExitStatus = employmentStatus.some((s) =>
        EXIT_EMPLOYMENT_STATUSES.has(s),
      );

      if (!hasExitStatus) continue;

      try {
        await this.employeeExitHandoffService.maybeEnqueueHandoff({
          workspaceId,
          teamMemberId: record.id as string,
          employmentStatus,
          actorWorkspaceMemberId: actorWorkspaceMemberId ?? null,
        });
      } catch (error) {
        this.logger.error(
          `TeamEmploymentStatusUpdateManyPostQueryHook: failed to enqueue handoff for team=${record.id}: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }
  }
}
