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

export type GpsCoords = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type VisitVerificationStep = 'selfie' | 'location' | 'notes' | 'result';

export type VerificationStatusColor =
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'gray';
