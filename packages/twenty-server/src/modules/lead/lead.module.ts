import { Module } from '@nestjs/common';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { MobileDeviceModule } from 'src/engine/core-modules/mobile-device/mobile-device.module';
import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { IddaTimelineWriterModule } from 'src/modules/idda-timeline-writer/idda-timeline-writer.module';
import { LeadFollowUpReminderModule } from 'src/modules/lead-follow-up-reminder/lead-follow-up-reminder.module';
import { LeadGeocoderModule } from 'src/modules/lead-geocoder/lead-geocoder.module';
import { MedleadsImportController } from 'src/modules/lead/controllers/medleads-import.controller';
import { MedleadsImportRestApiExceptionFilter } from 'src/modules/lead/filters/medleads-import-rest-api-exception.filter';
import { LeadAssignedNotificationPostQueryHook } from 'src/modules/lead/query-hooks/lead-assigned-notification.post-query.hook';
import { LeadReassignedNotificationPreQueryHook } from 'src/modules/lead/query-hooks/lead-reassigned-notification.pre-query.hook';
import { LeadConvertOnStatusPostQueryHook } from 'src/modules/lead/query-hooks/lead-convert-on-status.post-query.hook';
import { LeadFollowUpReminderPostQueryHook } from 'src/modules/lead/query-hooks/lead-follow-up-reminder.post-query.hook';
import { MedleadsImportService } from 'src/modules/lead/services/medleads-import.service';
import { MedleadsCsvParserService } from 'src/modules/lead/services/medleads-csv-parser.service';
import { MedleadsRowValidatorService } from 'src/modules/lead/services/medleads-row-validator.service';

@Module({
  imports: [
    AuthModule,
    MobileDeviceModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    IddaTimelineWriterModule,
    LeadFollowUpReminderModule,
    LeadGeocoderModule,
    GlobalWorkspaceDataSourceModule,
  ],
  controllers: [MedleadsImportController],
  providers: [
    MedleadsImportService,
    MedleadsCsvParserService,
    MedleadsRowValidatorService,
    MedleadsImportRestApiExceptionFilter,
    LeadAssignedNotificationPostQueryHook,
    LeadReassignedNotificationPreQueryHook,
    LeadConvertOnStatusPostQueryHook,
    LeadFollowUpReminderPostQueryHook,
  ],
  exports: [MedleadsImportService],
})
export class LeadModule {}
