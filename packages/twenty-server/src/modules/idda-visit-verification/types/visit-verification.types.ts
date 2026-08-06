export type GpsVerificationResult = {
  distanceFromClinic: number;
  locationStatus: 'WITHIN_RANGE' | 'OUTSIDE_RANGE' | 'SUSPICIOUS';
  isSuspicious: boolean;
};

export type FaceVerificationResult = {
  faceDetected: boolean;
  selfieStatus: 'CLEAR' | 'FACE_NOT_CLEAR' | 'MISSING';
};

export type ExifData = {
  dateTimeOriginal: Date | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  hasMissingMetadata: boolean;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  imageHash: string;
  matchingVisitId: string | null;
};

export type VerificationScoreResult = {
  score: number;
  verificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'NEEDS_REVIEW';
  breakdown: Record<string, number>;
};

export type VerifyVisitInput = {
  visitId: string;
  clinicId: string;
  visitNotes: string;
  selfieBase64: string;
  latitude: number;
  longitude: number;
  gpsAccuracy: number;
  isMockLocation?: boolean;
  deviceIdentifier?: string;
  captureSource?: 'CRM_MOBILE_CAMERA' | 'CRM_WEB_CAMERA';
  visitAddress?: string;
};

export type VerifyVisitOutput = {
  success: boolean;
  verificationScore: number;
  verificationStatus: string;
  selfieStatus: string;
  locationStatus: string;
  distanceFromClinic: number;
  imageReused: boolean;
  selfieUrl: string | null;
  issues: string[];
  scoreBreakdown: Record<string, number>;
};
