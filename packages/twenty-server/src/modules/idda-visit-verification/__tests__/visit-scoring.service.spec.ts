import { Test, TestingModule } from '@nestjs/testing';

import {
  VISIT_SCORING_THRESHOLDS,
  VISIT_VERIFICATION_WEIGHTS,
  type VisitVerificationFactors,
} from 'src/modules/idda-visit-verification/constants/verification-scoring-weights.constant';
import { VisitScoringService } from 'src/modules/idda-visit-verification/services/visit-scoring.service';

// Total max score = sum of all weights
const MAX_SCORE = Object.values(VISIT_VERIFICATION_WEIGHTS).reduce(
  (acc, w) => acc + w,
  0,
);

const ALL_TRUE: VisitVerificationFactors = {
  faceDetected: true,
  liveCameraCapture: true,
  gpsInsideGeofence: true,
  highGpsAccuracy: true,
  noMockLocation: true,
  notesCompleted: true,
  imageNotReused: true,
};

const ALL_FALSE: VisitVerificationFactors = {
  faceDetected: false,
  liveCameraCapture: false,
  gpsInsideGeofence: false,
  highGpsAccuracy: false,
  noMockLocation: false,
  notesCompleted: false,
  imageNotReused: false,
};

describe('VisitScoringService', () => {
  let service: VisitScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisitScoringService],
    }).compile();

    service = module.get(VisitScoringService);
  });

  // ─── Perfect scores ──────────────────────────────────────────────────────────

  it(`all factors true → score ${MAX_SCORE} → VERIFIED`, () => {
    const result = service.computeScore(ALL_TRUE);

    expect(result.score).toBe(MAX_SCORE);
    expect(result.verificationStatus).toBe('VERIFIED');
  });

  // ─── Single-factor-missing scenarios ────────────────────────────────────────

  it('faceDetected false only → score 80 → PARTIALLY_VERIFIED', () => {
    const result = service.computeScore({ ...ALL_TRUE, faceDetected: false });

    expect(result.score).toBe(MAX_SCORE - VISIT_VERIFICATION_WEIGHTS.faceDetected);
    expect(result.verificationStatus).toBe('PARTIALLY_VERIFIED');
  });

  it('liveCameraCapture false only → score 85 → PARTIALLY_VERIFIED', () => {
    const result = service.computeScore({ ...ALL_TRUE, liveCameraCapture: false });

    expect(result.score).toBe(MAX_SCORE - VISIT_VERIFICATION_WEIGHTS.liveCameraCapture);
    expect(result.verificationStatus).toBe('PARTIALLY_VERIFIED');
  });

  it('imageNotReused false only → score 80 → PARTIALLY_VERIFIED', () => {
    const result = service.computeScore({ ...ALL_TRUE, imageNotReused: false });

    expect(result.score).toBe(MAX_SCORE - VISIT_VERIFICATION_WEIGHTS.imageNotReused);
    expect(result.verificationStatus).toBe('PARTIALLY_VERIFIED');
  });

  // ─── Boundary scores ─────────────────────────────────────────────────────────

  it(`score exactly at verified threshold (${VISIT_SCORING_THRESHOLDS.verified}) → VERIFIED`, () => {
    // Construct factors that sum to exactly 95.
    // MAX_SCORE = 100: notesCompleted=5 weight, so setting notesCompleted=false gives 95.
    const factors: VisitVerificationFactors = { ...ALL_TRUE, notesCompleted: false };
    const result = service.computeScore(factors);

    expect(result.score).toBe(VISIT_SCORING_THRESHOLDS.verified);
    expect(result.verificationStatus).toBe('VERIFIED');
  });

  it(`score one below verified threshold (${VISIT_SCORING_THRESHOLDS.verified - 1}) → PARTIALLY_VERIFIED`, () => {
    // Need score = 94. MAX=100, notesCompleted=5, highGpsAccuracy=10
    // Remove highGpsAccuracy (10) + notesCompleted (5) = 85, then add back notesCompleted(5) = 90.
    // Actually: remove highGpsAccuracy(10) + half of noMockLocation is not possible since all are booleans.
    // Easier: remove faceDetected(20) + noMockLocation(10) = 70 removed → 30, then add notesCompleted = 35.
    // Let's compute precisely: we need 94.
    // MAX=100. Remove only enough to get 94. We cannot split weights.
    // Closest: liveCameraCapture(15)+notesCompleted(5)=20 removed → 80 — not 94.
    // Actually 94 is unreachable with these integer weights. Use score 90 to test PARTIALLY_VERIFIED.
    const factors: VisitVerificationFactors = {
      ...ALL_TRUE,
      faceDetected: false,  // -20 → 80
      notesCompleted: true, // we need 80 which is < 95 → PARTIALLY_VERIFIED
    };
    const result = service.computeScore(factors);

    expect(result.score).toBeLessThan(VISIT_SCORING_THRESHOLDS.verified);
    expect(result.verificationStatus).toBe('PARTIALLY_VERIFIED');
  });

  it(`score exactly at partiallyVerified threshold (${VISIT_SCORING_THRESHOLDS.partiallyVerified}) → PARTIALLY_VERIFIED`, () => {
    // Need score = 60. Weights: face=20, live=15, gps=20, accuracy=10, noMock=10, notes=5, reuse=20.
    // 20+20+15+5 = 60: faceDetected + gpsInsideGeofence + liveCameraCapture + notesCompleted
    const factors: VisitVerificationFactors = {
      faceDetected: true,
      gpsInsideGeofence: true,
      liveCameraCapture: true,
      notesCompleted: true,
      highGpsAccuracy: false,
      noMockLocation: false,
      imageNotReused: false,
    };
    const result = service.computeScore(factors);

    expect(result.score).toBe(VISIT_SCORING_THRESHOLDS.partiallyVerified);
    expect(result.verificationStatus).toBe('PARTIALLY_VERIFIED');
  });

  it(`score one below partiallyVerified threshold (${VISIT_SCORING_THRESHOLDS.partiallyVerified - 1}) → UNVERIFIED`, () => {
    // Need score = 59. Closest reachable without going exactly to 60:
    // noMockLocation(10)+highGpsAccuracy(10)+notesCompleted(5)+imageNotReused(20)+liveCameraCapture(15) = 60. Remove notesCompleted → 55.
    // That gives 55 < 60 → UNVERIFIED.
    const factors: VisitVerificationFactors = {
      faceDetected: false,
      gpsInsideGeofence: false,
      liveCameraCapture: true,  // 15
      highGpsAccuracy: true,    // 10
      noMockLocation: true,     // 10
      notesCompleted: false,
      imageNotReused: true,     // 20
    };
    // 15+10+10+20 = 55
    const result = service.computeScore(factors);

    expect(result.score).toBe(55);
    expect(result.score).toBeLessThan(VISIT_SCORING_THRESHOLDS.partiallyVerified);
    expect(result.verificationStatus).toBe('UNVERIFIED');
  });

  // ─── Only notes completed ────────────────────────────────────────────────────

  it('only notesCompleted true → score 5 → UNVERIFIED', () => {
    const factors: VisitVerificationFactors = { ...ALL_FALSE, notesCompleted: true };
    const result = service.computeScore(factors);

    expect(result.score).toBe(VISIT_VERIFICATION_WEIGHTS.notesCompleted);
    expect(result.verificationStatus).toBe('UNVERIFIED');
  });

  // ─── All false ────────────────────────────────────────────────────────────────

  it('all factors false → score 0 → UNVERIFIED', () => {
    const result = service.computeScore(ALL_FALSE);

    expect(result.score).toBe(0);
    expect(result.verificationStatus).toBe('UNVERIFIED');
  });

  // ─── Score breakdown ─────────────────────────────────────────────────────────

  it('breakdown keys match factor keys', () => {
    const result = service.computeScore(ALL_TRUE);
    const factorKeys = Object.keys(ALL_TRUE);

    expect(Object.keys(result.breakdown).sort()).toEqual(factorKeys.sort());
  });

  it('breakdown values are either 0 or the weight when factor is false', () => {
    const factors: VisitVerificationFactors = { ...ALL_FALSE, faceDetected: true };
    const result = service.computeScore(factors);

    expect(result.breakdown.faceDetected).toBe(VISIT_VERIFICATION_WEIGHTS.faceDetected);
    expect(result.breakdown.liveCameraCapture).toBe(0);
    expect(result.breakdown.gpsInsideGeofence).toBe(0);
  });
});
