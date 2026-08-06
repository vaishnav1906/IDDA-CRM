import { Module } from '@nestjs/common';

import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';
import { LeadGeocoderCreatePostQueryHook } from 'src/modules/lead-geocoder/lead-geocoder.post-query.hook';
import { LeadGeocoderUpdatePostQueryHook } from 'src/modules/lead-geocoder/lead-geocoder.post-query.hook';
import { LeadGeocoderService } from 'src/modules/lead-geocoder/services/lead-geocoder.service';

@Module({
  imports: [GlobalWorkspaceDataSourceModule],
  providers: [
    LeadGeocoderService,
    LeadGeocoderCreatePostQueryHook,
    LeadGeocoderUpdatePostQueryHook,
  ],
})
export class LeadGeocoderModule {}
