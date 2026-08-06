export const VISIT_VERIFICATION_WEIGHTS = {
  faceDetected: 20,
  liveCameraCapture: 15,
  gpsInsideGeofence: 20,
  highGpsAccuracy: 10,
  noMockLocation: 10,
  notesCompleted: 5,
  imageNotReused: 20,
} as const;

export type VisitVerificationFactors = {
  [K in keyof typeof VISIT_VERIFICATION_WEIGHTS]: boolean;
};

export const VISIT_SCORING_THRESHOLDS = {
  verified: 95,
  partiallyVerified: 60,
} as const;

export const VISIT_GEOFENCE_DEFAULTS = {
  radiusMeters: 40,
  highAccuracyThresholdMeters: 20,
  suspiciousAccuracyThresholdMeters: 150,
} as const;
