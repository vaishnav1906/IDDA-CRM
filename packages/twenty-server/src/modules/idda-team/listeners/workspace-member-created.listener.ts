import { Injectable } from '@nestjs/common';

import { type ObjectRecordCreateEvent } from 'twenty-shared/database-events';
import { isDefined } from 'twenty-shared/utils';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { TeamMemberSyncService } from 'src/modules/idda-team/services/team-member-sync.service';

@Injectable()
export class WorkspaceMemberCreatedListener {
  constructor(
    private readonly teamMemberSyncService: TeamMemberSyncService,
  ) {}

  @OnDatabaseBatchEvent('workspaceMember', DatabaseEventAction.CREATED)
  async handleCreatedEvent(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<WorkspaceMemberWorkspaceEntity>
    >,
  ): Promise<void> {
    const { workspaceId } = payload;

    for (const event of payload.events) {
      const member = event.properties.after;

      if (!isDefined(member)) {
        continue;
      }

      await this.teamMemberSyncService.upsertFromWorkspaceMember(workspaceId, {
        workspaceMemberId: event.recordId,
        name: {
          firstName: member.name?.firstName ?? '',
          lastName: member.name?.lastName ?? '',
        },
        workEmail: member.userEmail ?? null,
        userId: member.userId ?? null,
      });
    }
  }
}
