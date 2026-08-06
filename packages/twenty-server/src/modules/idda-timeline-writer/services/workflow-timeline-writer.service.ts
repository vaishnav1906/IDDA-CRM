import { Injectable, Logger } from '@nestjs/common';

import { InjectObjectMetadataRepository } from 'src/engine/object-metadata-repository/object-metadata-repository.decorator';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { TimelineActivityRepository } from 'src/modules/timeline/repositories/timeline-activity.repository';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { type WorkflowTimelineEvent } from 'src/modules/idda-timeline-writer/types/workflow-timeline-event.type';

/**
 * Thin service that writes workflow execution events to the record timeline.
 * Workflow action handlers call this after completing or failing a step so
 * the activity appears in the record's timeline feed without needing to wire
 * directly into the event-emitter pipeline.
 */
@Injectable()
export class WorkflowTimelineWriterService {
  private readonly logger = new Logger(WorkflowTimelineWriterService.name);

  constructor(
    @InjectObjectMetadataRepository(TimelineActivityWorkspaceEntity)
    private readonly timelineActivityRepository: TimelineActivityRepository,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async write(event: WorkflowTimelineEvent): Promise<void> {
    try {
      const authContext = buildSystemAuthContext(event.workspaceId);

      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          await this.timelineActivityRepository.insertTimelineActivities({
            objectSingularName: event.targetObjectSingularName,
            workspaceId: event.workspaceId,
            payloads: [
              {
                name: event.eventName,
                workspaceMemberId: event.workspaceMemberId,
                recordId: event.targetRecordId,
                properties: {
                  diff: event.properties ?? {},
                },
                linkedRecordCachedName: event.linkedRecordCachedName ?? '',
                linkedRecordId: event.linkedRecordId,
                linkedObjectMetadataId: event.linkedObjectMetadataId,
              },
            ],
          });
        },
        authContext,
      );
    } catch (error) {
      this.logger.error(
        `Failed to write workflow timeline event "${event.eventName}" ` +
          `for record ${event.targetRecordId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async writeMany(events: WorkflowTimelineEvent[]): Promise<void> {
    await Promise.allSettled(events.map((event) => this.write(event)));
  }
}
