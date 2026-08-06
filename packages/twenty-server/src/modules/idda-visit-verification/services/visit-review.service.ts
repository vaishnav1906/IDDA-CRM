import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { SetReviewDecisionOutput } from 'src/modules/idda-visit-verification/dtos/set-review-decision-output.dto';

const VALID_DECISIONS = ['APPROVED', 'REJECTED', 'PENDING'] as const;
type ReviewDecision = (typeof VALID_DECISIONS)[number];

@Injectable()
export class VisitReviewService {
  private readonly logger = new Logger(VisitReviewService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async setReviewDecision(
    visitId: string,
    decision: string,
    reviewComment: string | undefined,
    workspaceId: string,
  ): Promise<SetReviewDecisionOutput> {
    if (!VALID_DECISIONS.includes(decision as ReviewDecision)) {
      throw new BadRequestException(
        `Invalid review decision: ${decision}. Must be APPROVED, REJECTED, or PENDING.`,
      );
    }

    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const visitRepository =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            'visit',
            { shouldBypassPermissionChecks: true },
          );

        const visit = await visitRepository.findOne({
          where: { id: visitId } as never,
        });

        if (!visit) {
          throw new BadRequestException(`Visit ${visitId} not found.`);
        }

        const comment = reviewComment?.trim() || null;

        await visitRepository.update(
          { id: visitId } as never,
          { reviewDecision: decision, reviewComment: comment } as never,
        );

        this.logger.log(
          `Visit ${visitId} review set to ${decision} by workspace ${workspaceId}`,
        );

        return { visitId, reviewDecision: decision, reviewComment: comment };
      },
      authContext,
    );
  }
}
