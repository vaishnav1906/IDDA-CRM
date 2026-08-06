import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { AddLeadNavigationMenuItemCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000020000-add-lead-navigation-menu-item.command';
import { LeadSpecializationTextToSelectCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000030000-lead-specialization-text-to-select.command';
import { RemoveDemoNavItemsCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000040000-remove-demo-nav-items.command';
import { AddLeadStatusViewsCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000050000-add-lead-status-views.command';
import { AddLeadNextFollowUpDateFieldCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000060000-add-lead-next-follow-up-date-field.command';
import { RemoveLeadStatusViewsNavItemsCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000070000-remove-lead-status-views-nav-items.command';
import { AddVisitClinicPhotoAndReviewCommentFieldsCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000080000-add-visit-clinic-photo-and-review-comment-fields.command';
import { AddVisitVerificationFieldsCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000090000-add-visit-verification-fields.command';
import { AddReplyToMessageParticipantRoleOptionCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000001000-add-reply-to-message-participant-role-option.command';
import { AddWorkspaceMemberJobTitleFieldCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000010000-add-workspace-member-job-title-field.command';
import { SyncCallRecordingNavigationCommandMenuItemAvailabilityExpressionCommand } from 'src/database/commands/upgrade-version-command/2-17/2-17-workspace-command-1801000000000-sync-call-recording-navigation-command-menu-item-availability-expression.command';
import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { FieldMetadataEntity } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { FieldMetadataModule } from 'src/engine/metadata-modules/field-metadata/field-metadata.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { WorkspaceMigrationModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration.module';
import { WorkspaceMetadataVersionModule } from 'src/engine/metadata-modules/workspace-metadata-version/workspace-metadata-version.module';

@Module({
  imports: [
    ApplicationModule,
    FieldMetadataModule,
    TypeOrmModule.forFeature([FieldMetadataEntity]),
    WorkspaceCacheModule,
    WorkspaceIteratorModule,
    WorkspaceMigrationModule,
    WorkspaceMetadataVersionModule,
  ],
  providers: [
    SyncCallRecordingNavigationCommandMenuItemAvailabilityExpressionCommand,
    AddReplyToMessageParticipantRoleOptionCommand,
    AddWorkspaceMemberJobTitleFieldCommand,
    AddLeadNavigationMenuItemCommand,
    LeadSpecializationTextToSelectCommand,
    RemoveDemoNavItemsCommand,
    AddLeadStatusViewsCommand,
    AddLeadNextFollowUpDateFieldCommand,
    RemoveLeadStatusViewsNavItemsCommand,
    AddVisitClinicPhotoAndReviewCommentFieldsCommand,
    AddVisitVerificationFieldsCommand,
  ],
})
export class V2_17_UpgradeVersionCommandModule {}
