export const VISIT_VERIFICATION_CONFIG = {
  selfie: {
    jpegQuality: 0.85,
    idealWidth: 640,
    idealHeight: 480,
  },
  gps: {
    enableHighAccuracy: true,
    timeout: 15_000,
    maximumAge: 0,
  },
  scoring: {
    verified: 95,
    partiallyVerified: 60,
  },
} as const;

export const VISIT_NOTES_QUICK_REASONS = [
  'Clinic visit completed',
  'Doctor not available',
  'Sample delivery',
  'Order collection',
  'Relationship meeting',
  'Follow-up on previous order',
] as const;

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  VERIFIED: 'Verified',
  PARTIALLY_VERIFIED: 'Partially Verified',
  UNVERIFIED: 'Unverified',
  NEEDS_REVIEW: 'Needs Review',
};

export const VERIFICATION_STATUS_COLORS: Record<string, string> = {
  VERIFIED: '#10B981',
  PARTIALLY_VERIFIED: '#F59E0B',
  UNVERIFIED: '#EF4444',
  NEEDS_REVIEW: '#8B5CF6',
};

export const SCORE_FACTOR_LABELS: Record<string, string> = {
  faceDetected: 'Face Detected',
  liveCameraCapture: 'Live Camera Capture',
  gpsInsideGeofence: 'GPS Inside Geofence',
  highGpsAccuracy: 'High GPS Accuracy',
  noMockLocation: 'No Mock Location',
  notesCompleted: 'Notes Completed',
  imageNotReused: 'Image Not Reused',
};

export const SCORE_FACTOR_MAX: Record<string, number> = {
  faceDetected: 20,
  liveCameraCapture: 15,
  gpsInsideGeofence: 20,
  highGpsAccuracy: 10,
  noMockLocation: 10,
  notesCompleted: 5,
  imageNotReused: 20,
};
