import { Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { EmployeeExitHandoffService } from 'src/modules/employee-exit-handoff/services/employee-exit-handoff.service';
import { EXIT_EMPLOYMENT_STATUSES } from 'src/modules/employee-exit-handoff/constants/exit-handoff.constants';

@WorkspaceQueryHook({
  key: 'team.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class TeamEmploymentStatusPostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(TeamEmploymentStatusPostQueryHook.name);

  constructor(
    private readonly employeeExitHandoffService: EmployeeExitHandoffService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: any | any[],
  ): Promise<void> {
    const record = Array.isArray(payload) ? payload[0] : payload;

    if (!isDefined(record)) return;

    const teamMemberId = record.id as string | undefined;
    const employmentStatus: string[] =
      (record.employmentStatus as string[] | null) ?? [];

    if (!isDefined(teamMemberId)) return;

    // Only act if an exit status is present in the updated array
    const hasExitStatus = employmentStatus.some((s) =>
      EXIT_EMPLOYMENT_STATUSES.has(s),
    );

    if (!hasExitStatus) return;

    const workspaceId = authContext.workspace.id;
    const actorWorkspaceMemberId =
      authContext.type === 'user' ? authContext.workspaceMemberId : null;

    try {
      await this.employeeExitHandoffService.maybeEnqueueHandoff({
        workspaceId,
        teamMemberId,
        employmentStatus,
        actorWorkspaceMemberId: actorWorkspaceMemberId ?? null,
      });
    } catch (error) {
      this.logger.error(
        `TeamEmploymentStatusPostQueryHook: failed to enqueue handoff for team=${teamMemberId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
