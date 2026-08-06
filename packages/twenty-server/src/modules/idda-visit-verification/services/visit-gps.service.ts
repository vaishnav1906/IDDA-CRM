import { Injectable } from '@nestjs/common';

import {
  VISIT_GEOFENCE_DEFAULTS,
} from 'src/modules/idda-visit-verification/constants/verification-scoring-weights.constant';
import { type GpsVerificationResult } from 'src/modules/idda-visit-verification/types/visit-verification.types';

@Injectable()
export class VisitGpsService {
  /**
   * Haversine formula — computes great-circle distance in metres.
   * No external dependencies required.
   */
  calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6_371_000; // Earth radius in metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  detectSuspiciousLocation(
    gpsAccuracy: number,
    isMockLocation: boolean,
  ): boolean {
    if (isMockLocation) return true;
    if (gpsAccuracy > VISIT_GEOFENCE_DEFAULTS.suspiciousAccuracyThresholdMeters)
      return true;

    return false;
  }

  verifyLocation(params: {
    latitude: number;
    longitude: number;
    gpsAccuracy: number;
    clinicLatitude: number;
    clinicLongitude: number;
    radiusMeters?: number;
    isMockLocation?: boolean;
  }): GpsVerificationResult {
    const {
      latitude,
      longitude,
      gpsAccuracy,
      clinicLatitude,
      clinicLongitude,
      radiusMeters = VISIT_GEOFENCE_DEFAULTS.radiusMeters,
      isMockLocation = false,
    } = params;

    const distanceFromClinic = this.calculateDistanceMeters(
      latitude,
      longitude,
      clinicLatitude,
      clinicLongitude,
    );

    const isSuspicious = this.detectSuspiciousLocation(gpsAccuracy, isMockLocation);

    let locationStatus: GpsVerificationResult['locationStatus'];

    if (isSuspicious) {
      locationStatus = 'SUSPICIOUS';
    } else if (distanceFromClinic <= radiusMeters) {
      locationStatus = 'WITHIN_RANGE';
    } else {
      locationStatus = 'OUTSIDE_RANGE';
    }

    return {
      distanceFromClinic,
      locationStatus,
      isSuspicious,
    };
  }
}
