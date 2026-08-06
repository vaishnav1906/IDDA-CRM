import { Injectable } from '@nestjs/common';

import {
  type VisitVerificationFactors,
  VISIT_SCORING_THRESHOLDS,
  VISIT_VERIFICATION_WEIGHTS,
} from 'src/modules/idda-visit-verification/constants/verification-scoring-weights.constant';
import { type VerificationScoreResult } from 'src/modules/idda-visit-verification/types/visit-verification.types';

@Injectable()
export class VisitScoringService {
  computeScore(factors: VisitVerificationFactors): VerificationScoreResult {
    let score = 0;
    const breakdown: Record<string, number> = {};

    for (const [key, weight] of Object.entries(VISIT_VERIFICATION_WEIGHTS)) {
      const earned =
        factors[key as keyof VisitVerificationFactors] ? weight : 0;

      breakdown[key] = earned;
      score += earned;
    }

    let verificationStatus: VerificationScoreResult['verificationStatus'];

    if (score >= VISIT_SCORING_THRESHOLDS.verified) {
      verificationStatus = 'VERIFIED';
    } else if (score >= VISIT_SCORING_THRESHOLDS.partiallyVerified) {
      verificationStatus = 'PARTIALLY_VERIFIED';
    } else {
      verificationStatus = 'UNVERIFIED';
    }

    return { score, verificationStatus, breakdown };
  }
}
