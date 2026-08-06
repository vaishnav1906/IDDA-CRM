import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { SetReviewDecisionInput } from 'src/modules/idda-visit-verification/dtos/set-review-decision-input.dto';
import { SetReviewDecisionOutput } from 'src/modules/idda-visit-verification/dtos/set-review-decision-output.dto';
import { UploadClinicPhotoInput } from 'src/modules/idda-visit-verification/dtos/upload-clinic-photo-input.dto';
import { VerifyVisitInput } from 'src/modules/idda-visit-verification/dtos/verify-visit-input.dto';
import { VerifyVisitOutput } from 'src/modules/idda-visit-verification/dtos/verify-visit-output.dto';
import { VisitClinicPhotoService } from 'src/modules/idda-visit-verification/services/visit-clinic-photo.service';
import { VisitReviewService } from 'src/modules/idda-visit-verification/services/visit-review.service';
import { VisitVerificationOrchestratorService } from 'src/modules/idda-visit-verification/services/visit-verification-orchestrator.service';

@CoreResolver()
@UsePipes(ResolverValidationPipe)
@UseFilters(AuthGraphqlApiExceptionFilter)
@UseGuards(WorkspaceAuthGuard)
export class VisitVerificationResolver {
  private readonly logger = new Logger(VisitVerificationResolver.name);

  constructor(
    private readonly visitVerificationOrchestratorService: VisitVerificationOrchestratorService,
    private readonly visitClinicPhotoService: VisitClinicPhotoService,
    private readonly visitReviewService: VisitReviewService,
  ) {}

  @Mutation(() => VerifyVisitOutput)
  async verifyVisit(
    @Args('input') input: VerifyVisitInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<VerifyVisitOutput> {
    try {
      return await this.visitVerificationOrchestratorService.verifyVisit(
        {
          visitId: input.visitId,
          clinicId: input.clinicId,
          visitNotes: input.visitNotes,
          selfieBase64: input.selfieBase64,
          latitude: input.latitude,
          longitude: input.longitude,
          gpsAccuracy: input.gpsAccuracy,
          isMockLocation: input.isMockLocation,
          deviceIdentifier: input.deviceIdentifier,
          captureSource: input.captureSource as
            | 'CRM_MOBILE_CAMERA'
            | 'CRM_WEB_CAMERA'
            | undefined,
          visitAddress: input.visitAddress,
        },
        workspace.id,
        workspaceMemberId,
      );
    } catch (error) {
      this.logger.error('verifyVisit mutation error', error);
      throw error;
    }
  }

  @Mutation(() => String)
  async uploadClinicPhoto(
    @Args('input') input: UploadClinicPhotoInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<string> {
    try {
      const result = await this.visitClinicPhotoService.uploadClinicPhoto(
        input.visitId,
        input.photoBase64,
        workspace.id,
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  @Query(() => String, { nullable: true })
  async getClinicPhotoUrl(
    @Args('visitId', { type: () => String }) visitId: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<string | null> {
    return this.visitClinicPhotoService.getClinicPhotoUrl(visitId, workspace.id);
  }

  @Query(() => String, { nullable: true })
  async getSelfiePhotoUrl(
    @Args('visitId', { type: () => String }) visitId: string,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<string | null> {
    return this.visitClinicPhotoService.getSelfiePhotoUrl(visitId, workspace.id);
  }

  @Mutation(() => SetReviewDecisionOutput)
  async setVisitReviewDecision(
    @Args('input') input: SetReviewDecisionInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<SetReviewDecisionOutput> {
    try {
      return await this.visitReviewService.setReviewDecision(
        input.visitId,
        input.decision,
        input.reviewComment,
        workspace.id,
      );
    } catch (error) {
      this.logger.error('setVisitReviewDecision mutation error', error);
      throw error;
    }
  }
}
