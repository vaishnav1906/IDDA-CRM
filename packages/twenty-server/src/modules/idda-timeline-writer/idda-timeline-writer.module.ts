import { Module } from '@nestjs/common';

import { ObjectMetadataRepositoryModule } from 'src/engine/object-metadata-repository/object-metadata-repository.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';

@Module({
  imports: [
    ObjectMetadataRepositoryModule.forFeature([TimelineActivityWorkspaceEntity]),
    TwentyORMModule,
  ],
  providers: [WorkflowTimelineWriterService],
  exports: [WorkflowTimelineWriterService],
})
export class IddaTimelineWriterModule {}
