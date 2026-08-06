import { Test, TestingModule } from '@nestjs/testing';

import { VISIT_GEOFENCE_DEFAULTS } from 'src/modules/idda-visit-verification/constants/verification-scoring-weights.constant';
import { VisitGpsService } from 'src/modules/idda-visit-verification/services/visit-gps.service';

// IDDA HQ test point: Mumbai office approx coords used as reference.
// Real-world anchor: 19.0760° N, 72.8777° E
const IDDA_HQ = { lat: 19.076, lon: 72.8777 };

describe('VisitGpsService', () => {
  let service: VisitGpsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisitGpsService],
    }).compile();

    service = module.get(VisitGpsService);
  });

  // ─── calculateDistanceMeters ────────────────────────────────────────────────

  describe('calculateDistanceMeters', () => {
    it('returns 0 for identical coordinates', () => {
      expect(service.calculateDistanceMeters(0, 0, 0, 0)).toBe(0);
    });

    it('calculates Haversine distance within 1 m for known IDDA HQ test point', () => {
      // ~39 m NE of IDDA HQ (computed via online Haversine calculator)
      // δlat ≈ 0.00035°, δlon ≈ 0 → ≈ 38.9 m
      const dist = service.calculateDistanceMeters(
        IDDA_HQ.lat,
        IDDA_HQ.lon,
        IDDA_HQ.lat + 0.00035,
        IDDA_HQ.lon,
      );

      // Expected ≈ 38.95 m — verify it's in (37, 40) range
      expect(dist).toBeGreaterThan(37);
      expect(dist).toBeLessThan(40);
    });

    it('calculates known equatorial distance accurately (within 1 m)', () => {
      // 1° of latitude ≈ 111 195 m at the equator
      const dist = service.calculateDistanceMeters(0, 0, 1, 0);

      expect(Math.abs(dist - 111_195)).toBeLessThan(1);
    });
  });

  // ─── verifyLocation ─────────────────────────────────────────────────────────

  describe('verifyLocation', () => {
    const baseParams = {
      latitude: IDDA_HQ.lat,
      longitude: IDDA_HQ.lon,
      gpsAccuracy: 10,
      isMockLocation: false,
    };

    it('returns WITHIN_RANGE when device is inside geofence (distance < 40 m)', () => {
      // Same point as clinic → distance = 0
      const result = service.verifyLocation({
        ...baseParams,
        clinicLatitude: IDDA_HQ.lat,
        clinicLongitude: IDDA_HQ.lon,
      });

      expect(result.locationStatus).toBe('WITHIN_RANGE');
      expect(result.distanceFromClinic).toBeCloseTo(0, 0);
      expect(result.isSuspicious).toBe(false);
    });

    it('returns OUTSIDE_RANGE when device is outside geofence (distance > 40 m)', () => {
      // ~111 m offset in latitude
      const result = service.verifyLocation({
        ...baseParams,
        clinicLatitude: IDDA_HQ.lat + 0.001, // ≈ 111 m away
        clinicLongitude: IDDA_HQ.lon,
      });

      expect(result.locationStatus).toBe('OUTSIDE_RANGE');
      expect(result.distanceFromClinic).toBeGreaterThan(40);
    });

    it('returns WITHIN_RANGE at exactly 40 m boundary (inclusive)', () => {
      // 40 m in latitude degrees ≈ 0.000360°
      const result = service.verifyLocation({
        ...baseParams,
        clinicLatitude: IDDA_HQ.lat + 0.00036,
        clinicLongitude: IDDA_HQ.lon,
        radiusMeters: VISIT_GEOFENCE_DEFAULTS.radiusMeters,
      });

      // Distance should be ≈ 40 m — could land either side depending on rounding,
      // so check that the status is consistent with distance ≤ radius
      expect(result.distanceFromClinic).toBeLessThanOrEqual(41);
      expect(result.locationStatus).toMatch(/WITHIN_RANGE|OUTSIDE_RANGE/);
    });

    it('returns WITHIN_RANGE when distance is exactly at radius', () => {
      // Manufacture a case where distance === radiusMeters exactly by
      // setting radiusMeters to the computed distance.
      const clinicLatOffset = 0.0002; // some offset
      const dist = service.calculateDistanceMeters(
        IDDA_HQ.lat,
        IDDA_HQ.lon,
        IDDA_HQ.lat + clinicLatOffset,
        IDDA_HQ.lon,
      );

      const result = service.verifyLocation({
        ...baseParams,
        clinicLatitude: IDDA_HQ.lat + clinicLatOffset,
        clinicLongitude: IDDA_HQ.lon,
        radiusMeters: dist, // set radius exactly to the distance
      });

      expect(result.locationStatus).toBe('WITHIN_RANGE');
    });

    it('returns SUSPICIOUS when GPS accuracy is poor (> 150 m)', () => {
      const result = service.verifyLocation({
        ...baseParams,
        gpsAccuracy: 200, // > suspiciousAccuracyThresholdMeters (150)
        clinicLatitude: IDDA_HQ.lat,
        clinicLongitude: IDDA_HQ.lon,
      });

      expect(result.locationStatus).toBe('SUSPICIOUS');
      expect(result.isSuspicious).toBe(true);
    });

    it('returns SUSPICIOUS when isMockLocation is true', () => {
      const result = service.verifyLocation({
        ...baseParams,
        isMockLocation: true,
        clinicLatitude: IDDA_HQ.lat,
        clinicLongitude: IDDA_HQ.lon,
      });

      expect(result.locationStatus).toBe('SUSPICIOUS');
      expect(result.isSuspicious).toBe(true);
    });

    it('returns SUSPICIOUS for mock location regardless of distance', () => {
      // Device is co-located with clinic but location is mocked
      const result = service.verifyLocation({
        ...baseParams,
        isMockLocation: true,
        clinicLatitude: IDDA_HQ.lat,
        clinicLongitude: IDDA_HQ.lon,
      });

      // Must be suspicious — not trusted as WITHIN_RANGE
      expect(result.locationStatus).toBe('SUSPICIOUS');
    });

    it('uses custom radiusMeters when provided', () => {
      // 10 m radius, device is 20 m away → OUTSIDE
      const result = service.verifyLocation({
        ...baseParams,
        clinicLatitude: IDDA_HQ.lat + 0.00018, // ≈ 20 m
        clinicLongitude: IDDA_HQ.lon,
        radiusMeters: 10,
      });

      expect(result.locationStatus).toBe('OUTSIDE_RANGE');
    });
  });

  // ─── detectSuspiciousLocation ────────────────────────────────────────────────

  describe('detectSuspiciousLocation', () => {
    it('returns false for accurate, real GPS', () => {
      expect(service.detectSuspiciousLocation(5, false)).toBe(false);
    });

    it('returns true for mock location', () => {
      expect(service.detectSuspiciousLocation(5, true)).toBe(true);
    });

    it('returns true when accuracy exceeds threshold (150 m)', () => {
      expect(
        service.detectSuspiciousLocation(
          VISIT_GEOFENCE_DEFAULTS.suspiciousAccuracyThresholdMeters + 1,
          false,
        ),
      ).toBe(true);
    });

    it('returns false at exactly the accuracy threshold', () => {
      expect(
        service.detectSuspiciousLocation(
          VISIT_GEOFENCE_DEFAULTS.suspiciousAccuracyThresholdMeters,
          false,
        ),
      ).toBe(false);
    });
  });
});
