import { Module } from '@nestjs/common';

import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { FileUrlModule } from 'src/engine/core-modules/file/file-url/file-url.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';
import { VisitClinicPhotoController } from 'src/modules/idda-visit-verification/controllers/visit-clinic-photo.controller';
import { VisitSelfiePhotoController } from 'src/modules/idda-visit-verification/controllers/visit-selfie-photo.controller';
import { ClinicPhotoServeGuard } from 'src/modules/idda-visit-verification/guards/clinic-photo-serve.guard';
import { VisitDuplicateImageService } from 'src/modules/idda-visit-verification/services/visit-duplicate-image.service';
import { VisitExifService } from 'src/modules/idda-visit-verification/services/visit-exif.service';
import { VisitFaceService } from 'src/modules/idda-visit-verification/services/visit-face.service';
import { VisitGpsService } from 'src/modules/idda-visit-verification/services/visit-gps.service';
import { VisitScoringService } from 'src/modules/idda-visit-verification/services/visit-scoring.service';
import { VisitClinicPhotoService } from 'src/modules/idda-visit-verification/services/visit-clinic-photo.service';
import { VisitClinicPhotoStorageService } from 'src/modules/idda-visit-verification/services/visit-clinic-photo-storage.service';
import { VisitReviewService } from 'src/modules/idda-visit-verification/services/visit-review.service';
import { VisitSelfieStorageService } from 'src/modules/idda-visit-verification/services/visit-selfie-storage.service';
import { VisitVerificationOrchestratorService } from 'src/modules/idda-visit-verification/services/visit-verification-orchestrator.service';
import { VisitVerificationResolver } from 'src/modules/idda-visit-verification/resolvers/visit-verification.resolver';

@Module({
  imports: [
    GlobalWorkspaceDataSourceModule,
    ApplicationModule, // provides ApplicationService for selfie storage
    FileUrlModule,
    JwtModule, // provides JwtWrapperService for ClinicPhotoServeGuard
  ],
  controllers: [
    VisitClinicPhotoController,
    VisitSelfiePhotoController,
  ],
  providers: [
    VisitGpsService,
    VisitFaceService,
    VisitExifService,
    VisitDuplicateImageService,
    VisitSelfieStorageService,
    VisitClinicPhotoStorageService,
    VisitClinicPhotoService,
    VisitReviewService,
    VisitScoringService,
    VisitVerificationOrchestratorService,
    VisitVerificationResolver,
    ClinicPhotoServeGuard,
  ],
  exports: [VisitVerificationOrchestratorService],
})
export class IddaVisitVerificationModule {}
