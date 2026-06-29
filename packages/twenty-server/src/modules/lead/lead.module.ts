import { Module } from '@nestjs/common';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MedleadsImportController } from 'src/modules/lead/controllers/medleads-import.controller';
import { MedleadsImportRestApiExceptionFilter } from 'src/modules/lead/filters/medleads-import-rest-api-exception.filter';
import { MedleadsImportService } from 'src/modules/lead/services/medleads-import.service';
import { MedleadsCsvParserService } from 'src/modules/lead/services/medleads-csv-parser.service';
import { MedleadsRowValidatorService } from 'src/modules/lead/services/medleads-row-validator.service';

@Module({
  imports: [AuthModule, TwentyORMModule, WorkspaceCacheStorageModule],
  controllers: [MedleadsImportController],
  providers: [
    MedleadsImportService,
    MedleadsCsvParserService,
    MedleadsRowValidatorService,
    MedleadsImportRestApiExceptionFilter,
  ],
  exports: [MedleadsImportService],
})
export class LeadModule {}
