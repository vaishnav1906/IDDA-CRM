import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { VisitDuplicateImageService } from 'src/modules/idda-visit-verification/services/visit-duplicate-image.service';
import { VisitExifService } from 'src/modules/idda-visit-verification/services/visit-exif.service';
import { VisitFaceService } from 'src/modules/idda-visit-verification/services/visit-face.service';
import { VisitGpsService } from 'src/modules/idda-visit-verification/services/visit-gps.service';
import { VisitScoringService } from 'src/modules/idda-visit-verification/services/visit-scoring.service';
import { VisitSelfieStorageService } from 'src/modules/idda-visit-verification/services/visit-selfie-storage.service';
import { VisitVerificationOrchestratorService } from 'src/modules/idda-visit-verification/services/visit-verification-orchestrator.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a minimal valid JPEG buffer (FFD8FF + padding). */
function makeJpegBuffer(sizeBytes = 8192): Buffer {
  const buf = Buffer.alloc(sizeBytes, 0);

  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;

  return buf;
}

/** Encodes a buffer to a raw base64 string. */
const toBase64 = (buf: Buffer) => buf.toString('base64');

const WORKSPACE_ID = 'ws-test-001';
const WORKSPACE_MEMBER_ID = 'member-bd-001';
const VISIT_ID = 'visit-abc-123';
const CLINIC_ID = 'clinic-xyz-456';
const VALID_NOTES = 'Completed clinic visit successfully today.'; // >10 chars

const baseInput = {
  visitId: VISIT_ID,
  clinicId: CLINIC_ID,
  visitNotes: VALID_NOTES,
  selfieBase64: toBase64(makeJpegBuffer()),
  latitude: 19.076,
  longitude: 72.8777,
  gpsAccuracy: 10,
  isMockLocation: false,
};

// ─── Mock factories ───────────────────────────────────────────────────────────

type VisitRecordOverride = Partial<{
  id: string;
  employeeId: string | null | undefined;
  createdBy: { workspaceMemberId: string | null } | null | undefined;
}>;

function makeVisitRepo(overrides: VisitRecordOverride = {}) {
  // Default: no explicit employeeId (mimics live state before migration),
  // createdBy.workspaceMemberId set to the authenticated member.
  const visitRecord: Record<string, unknown> = {
    id: VISIT_ID,
    createdBy: { workspaceMemberId: WORKSPACE_MEMBER_ID },
    ...overrides,
  };

  return {
    findOne: jest.fn().mockResolvedValue(visitRecord),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCompanyRepo(clinic: { latitude: number | null; longitude: number | null } | null) {
  return {
    findOne: jest.fn().mockResolvedValue(
      clinic ? { id: CLINIC_ID, ...clinic } : null,
    ),
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('VisitVerificationOrchestratorService', () => {
  let service: VisitVerificationOrchestratorService;
  let mockOrmManager: {
    executeInWorkspaceContext: jest.Mock;
    getRepository: jest.Mock;
  };
  let mockFaceService: { verifyFaceQuality: jest.Mock };
  let mockExifService: { extractExifData: jest.Mock };
  let mockDuplicateService: { checkForDuplicate: jest.Mock };
  let mockGpsService: { verifyLocation: jest.Mock };
  let mockScoringService: { computeScore: jest.Mock };
  let mockStorageService: { storeSelfie: jest.Mock };

  const defaultVisitRepo = () => makeVisitRepo();
  const defaultCompanyRepo = () =>
    makeCompanyRepo({ latitude: 19.076, longitude: 72.8777 });

  beforeEach(async () => {
    mockFaceService = {
      verifyFaceQuality: jest.fn().mockResolvedValue({
        faceDetected: true,
        selfieStatus: 'CLEAR',
      }),
    };

    mockExifService = {
      extractExifData: jest.fn().mockReturnValue({
        dateTimeOriginal: new Date(),
        gpsLatitude: 19.076,
        gpsLongitude: 72.8777,
        hasMissingMetadata: false,
      }),
    };

    mockDuplicateService = {
      checkForDuplicate: jest.fn().mockResolvedValue({
        isDuplicate: false,
        imageHash: 'abc123hash',
        matchingVisitId: null,
      }),
    };

    mockGpsService = {
      verifyLocation: jest.fn().mockReturnValue({
        distanceFromClinic: 5,
        locationStatus: 'WITHIN_RANGE',
        isSuspicious: false,
      }),
    };

    mockScoringService = {
      computeScore: jest.fn().mockReturnValue({
        score: 100,
        verificationStatus: 'VERIFIED',
        breakdown: {
          faceDetected: 20,
          liveCameraCapture: 15,
          gpsInsideGeofence: 20,
          highGpsAccuracy: 10,
          noMockLocation: 10,
          notesCompleted: 5,
          imageNotReused: 20,
        },
      }),
    };

    mockStorageService = {
      storeSelfie: jest.fn().mockResolvedValue('visit-selfie/visit-abc-123.jpg'),
    };

    const visitRepo = defaultVisitRepo();
    const companyRepo = defaultCompanyRepo();

    mockOrmManager = {
      // executeInWorkspaceContext just runs the callback — unit tests verify
      // business logic, not workspace context plumbing.
      executeInWorkspaceContext: jest
        .fn()
        .mockImplementation((fn: () => unknown) => fn()),
      getRepository: jest.fn().mockImplementation((_workspaceId, entityName) => {
        if (entityName === 'visit') return Promise.resolve(visitRepo);
        if (entityName === 'company') return Promise.resolve(companyRepo);

        return Promise.resolve({ findOne: jest.fn(), update: jest.fn() });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitVerificationOrchestratorService,
        { provide: GlobalWorkspaceOrmManager, useValue: mockOrmManager },
        { provide: VisitFaceService, useValue: mockFaceService },
        { provide: VisitExifService, useValue: mockExifService },
        { provide: VisitDuplicateImageService, useValue: mockDuplicateService },
        { provide: VisitGpsService, useValue: mockGpsService },
        { provide: VisitScoringService, useValue: mockScoringService },
        { provide: VisitSelfieStorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get(VisitVerificationOrchestratorService);
  });

  // ─── Validation: notes ───────────────────────────────────────────────────────

  it('throws BadRequestException when visitNotes is empty', async () => {
    await expect(
      service.verifyVisit(
        { ...baseInput, visitNotes: '' },
        WORKSPACE_ID,
        WORKSPACE_MEMBER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when visitNotes is only whitespace', async () => {
    await expect(
      service.verifyVisit(
        { ...baseInput, visitNotes: '   ' },
        WORKSPACE_ID,
        WORKSPACE_MEMBER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when visitNotes is fewer than 10 chars', async () => {
    await expect(
      service.verifyVisit(
        { ...baseInput, visitNotes: 'short' },
        WORKSPACE_ID,
        WORKSPACE_MEMBER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws error with descriptive message for short notes', async () => {
    await expect(
      service.verifyVisit(
        { ...baseInput, visitNotes: 'too short' },
        WORKSPACE_ID,
        WORKSPACE_MEMBER_ID,
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining('10'),
    });
  });

  // ─── Validation: selfie base64 ───────────────────────────────────────────────

  it('throws BadRequestException for oversized selfie (> 5 MB)', async () => {
    const oversizedBase64 = 'A'.repeat(5 * 1024 * 1024 + 1);

    await expect(
      service.verifyVisit(
        { ...baseInput, selfieBase64: oversizedBase64 },
        WORKSPACE_ID,
        WORKSPACE_MEMBER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for non-image base64 (e.g. plain text data)', async () => {
    // Base64 of "Hello, World!" — not JPEG/PNG
    const textBase64 = Buffer.from('Hello, World!').toString('base64');

    await expect(
      service.verifyVisit(
        { ...baseInput, selfieBase64: textBase64 },
        WORKSPACE_ID,
        WORKSPACE_MEMBER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for malformed/empty base64', async () => {
    await expect(
      service.verifyVisit(
        { ...baseInput, selfieBase64: '' },
        WORKSPACE_ID,
        WORKSPACE_MEMBER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts data URI prefixed base64', async () => {
    const dataUri = `data:image/jpeg;base64,${toBase64(makeJpegBuffer())}`;
    const result = await service.verifyVisit(
      { ...baseInput, selfieBase64: dataUri },
      WORKSPACE_ID,
      WORKSPACE_MEMBER_ID,
    );

    expect(result.success).toBe(true);
  });

  // ─── Authorization — ownership resolution ────────────────────────────────────

  // Helper to swap the visit repo mid-test
  function useVisitRepo(overrides: VisitRecordOverride) {
    const visitRepo = makeVisitRepo(overrides);
    const companyRepo = defaultCompanyRepo();

    mockOrmManager.getRepository.mockImplementation((_ws: string, entityName: string) => {
      if (entityName === 'visit') return Promise.resolve(visitRepo);
      if (entityName === 'company') return Promise.resolve(companyRepo);

      return Promise.resolve({ findOne: jest.fn(), update: jest.fn() });
    });

    return visitRepo;
  }

  // 1. employeeId present and matches
  it('allows verification when employeeId matches the authenticated member', async () => {
    useVisitRepo({ employeeId: WORKSPACE_MEMBER_ID, createdBy: null });

    const result = await service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID);

    expect(result).toBeDefined();
    expect(result.verificationScore).toBeGreaterThanOrEqual(0);
  });

  // 2. employeeId present and differs → rejected
  it('throws ForbiddenException when employeeId is set to a different member', async () => {
    useVisitRepo({
      employeeId: 'member-other-999',
      createdBy: { workspaceMemberId: WORKSPACE_MEMBER_ID }, // createdBy is the caller, but employeeId takes priority
    });

    await expect(
      service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  // 3. employeeId undefined (not deployed) → falls back to createdBy.workspaceMemberId, matches
  it('allows verification via createdBy when employeeId is undefined (pre-migration)', async () => {
    useVisitRepo({
      employeeId: undefined,
      createdBy: { workspaceMemberId: WORKSPACE_MEMBER_ID },
    });

    const result = await service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID);

    expect(result).toBeDefined();
  });

  // 4. employeeId undefined, createdBy differs → rejected
  it('throws ForbiddenException when employeeId is undefined and createdBy belongs to a different member', async () => {
    useVisitRepo({
      employeeId: undefined,
      createdBy: { workspaceMemberId: 'member-other-999' },
    });

    await expect(
      service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  // 5. employeeId explicitly null (deployed but unset) → falls back to createdBy, matches
  it('allows verification via createdBy when employeeId is explicitly null', async () => {
    useVisitRepo({
      employeeId: null,
      createdBy: { workspaceMemberId: WORKSPACE_MEMBER_ID },
    });

    const result = await service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID);

    expect(result).toBeDefined();
  });

  // 6. employeeId null, createdBy differs → rejected
  it('throws ForbiddenException when employeeId is null and createdBy belongs to a different member', async () => {
    useVisitRepo({
      employeeId: null,
      createdBy: { workspaceMemberId: 'member-other-999' },
    });

    await expect(
      service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  // 7. Both ownership sources missing → rejected with BadRequestException (not ForbiddenException)
  it('throws BadRequestException when both employeeId and createdBy.workspaceMemberId are missing', async () => {
    useVisitRepo({
      employeeId: undefined,
      createdBy: { workspaceMemberId: null },
    });

    await expect(
      service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException (not ForbiddenException) for missing ownership', async () => {
    useVisitRepo({ employeeId: undefined, createdBy: null });

    await expect(
      service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID),
    ).rejects.toMatchObject({ message: expect.stringContaining('ownership') });
  });

  // 8. employeeId takes priority over createdBy when both are set
  it('employeeId takes priority: uses employeeId match, ignores createdBy', async () => {
    const differentMember = 'member-other-999';

    // employeeId = caller, createdBy = someone else — should PASS
    useVisitRepo({
      employeeId: WORKSPACE_MEMBER_ID,
      createdBy: { workspaceMemberId: differentMember },
    });

    const result = await service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID);

    expect(result).toBeDefined();
  });

  it('employeeId takes priority: employeeId mismatch blocks even if createdBy matches', async () => {
    const differentMember = 'member-other-999';

    // employeeId = someone else, createdBy = caller — should BLOCK
    useVisitRepo({
      employeeId: differentMember,
      createdBy: { workspaceMemberId: WORKSPACE_MEMBER_ID },
    });

    await expect(
      service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  // 9. Legacy Visit using createdBy (realistic live scenario)
  it('legacy Visit record (pre-employee-relation migration) authorises via createdBy', async () => {
    // Simulates the exact live state from the ownership trace:
    //   employeeId: undefined (field absent from ORM result)
    //   createdBy.workspaceMemberId: the authenticated user
    useVisitRepo({
      employeeId: undefined,
      createdBy: {
        workspaceMemberId: WORKSPACE_MEMBER_ID,
      },
    });

    const result = await service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID);

    expect(result.success).toBe(true);
    expect(result.verificationStatus).toBe('VERIFIED');
  });

  // ─── GPS: clinic null coordinates ────────────────────────────────────────────

  it('handles clinic with null coordinates gracefully — skips GPS check, awards 0 GPS points', async () => {
    const visitRepo = defaultVisitRepo();
    const companyRepoNull = makeCompanyRepo({ latitude: null, longitude: null });

    mockOrmManager.getRepository.mockImplementation((_ws, entityName) => {
      if (entityName === 'visit') return Promise.resolve(visitRepo);
      if (entityName === 'company') return Promise.resolve(companyRepoNull);

      return Promise.resolve({ findOne: jest.fn(), update: jest.fn() });
    });

    mockScoringService.computeScore.mockReturnValue({
      score: 60,
      verificationStatus: 'PARTIALLY_VERIFIED',
      breakdown: {
        faceDetected: 20,
        liveCameraCapture: 15,
        gpsInsideGeofence: 0,
        highGpsAccuracy: 10,
        noMockLocation: 10,
        notesCompleted: 5,
        imageNotReused: 0,
      },
    });

    const result = await service.verifyVisit(
      baseInput,
      WORKSPACE_ID,
      WORKSPACE_MEMBER_ID,
    );

    // gpsInsideGeofence should be false (0 points) when clinic coords unavailable
    expect(mockGpsService.verifyLocation).not.toHaveBeenCalled();
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('GPS check skipped')]),
    );
  });

  it('handles clinic not found gracefully', async () => {
    const visitRepo = defaultVisitRepo();
    const companyRepoNotFound = { findOne: jest.fn().mockResolvedValue(null) };

    mockOrmManager.getRepository.mockImplementation((_ws, entityName) => {
      if (entityName === 'visit') return Promise.resolve(visitRepo);
      if (entityName === 'company') return Promise.resolve(companyRepoNotFound);

      return Promise.resolve({ findOne: jest.fn(), update: jest.fn() });
    });

    const result = await service.verifyVisit(
      baseInput,
      WORKSPACE_ID,
      WORKSPACE_MEMBER_ID,
    );

    expect(mockGpsService.verifyLocation).not.toHaveBeenCalled();
    expect(result.locationStatus).toBe('OUTSIDE_RANGE');
  });

  // ─── Face check failure ───────────────────────────────────────────────────────

  it('records selfie quality issue when face not detected', async () => {
    mockFaceService.verifyFaceQuality.mockResolvedValue({
      faceDetected: false,
      selfieStatus: 'FACE_NOT_CLEAR',
    });

    mockScoringService.computeScore.mockReturnValue({
      score: 45,
      verificationStatus: 'UNVERIFIED',
      breakdown: {
        faceDetected: 0,
        liveCameraCapture: 15,
        gpsInsideGeofence: 20,
        highGpsAccuracy: 10,
        noMockLocation: 10,
        notesCompleted: 5,
        imageNotReused: 20,
      },
    });

    const result = await service.verifyVisit(
      baseInput,
      WORKSPACE_ID,
      WORKSPACE_MEMBER_ID,
    );

    expect(result.selfieStatus).toBe('FACE_NOT_CLEAR');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('FACE_NOT_CLEAR')]),
    );
  });

  // ─── Duplicate detection ──────────────────────────────────────────────────────

  it('sets imageReused=true and adds issue when duplicate detected', async () => {
    mockDuplicateService.checkForDuplicate.mockResolvedValue({
      isDuplicate: true,
      imageHash: 'abc123hash',
      matchingVisitId: 'visit-prev-001',
    });

    mockScoringService.computeScore.mockReturnValue({
      score: 80,
      verificationStatus: 'PARTIALLY_VERIFIED',
      breakdown: {
        faceDetected: 20,
        liveCameraCapture: 15,
        gpsInsideGeofence: 20,
        highGpsAccuracy: 10,
        noMockLocation: 10,
        notesCompleted: 5,
        imageNotReused: 0,
      },
    });

    const result = await service.verifyVisit(
      baseInput,
      WORKSPACE_ID,
      WORKSPACE_MEMBER_ID,
    );

    expect(result.imageReused).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Duplicate image')]),
    );
    // imageNotReused factor should be false → scoring service receives it as false
    const scoringCallArgs = mockScoringService.computeScore.mock.calls[0][0];

    expect(scoringCallArgs.imageNotReused).toBe(false);
  });

  // ─── Idempotency (repeated submission) ───────────────────────────────────────

  it('second call for same visitId overwrites cleanly (no duplicate row, calls update again)', async () => {
    const visitRepo = defaultVisitRepo();
    const companyRepo = defaultCompanyRepo();

    mockOrmManager.getRepository.mockImplementation((_ws, entityName) => {
      if (entityName === 'visit') return Promise.resolve(visitRepo);
      if (entityName === 'company') return Promise.resolve(companyRepo);

      return Promise.resolve({ findOne: jest.fn(), update: jest.fn() });
    });

    await service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID);
    await service.verifyVisit(baseInput, WORKSPACE_ID, WORKSPACE_MEMBER_ID);

    // update() called twice — second overwrites first cleanly
    expect(visitRepo.update).toHaveBeenCalledTimes(2);
  });

  // ─── Successful full flow ─────────────────────────────────────────────────────

  it('successful full flow returns correct score and VERIFIED status', async () => {
    const result = await service.verifyVisit(
      baseInput,
      WORKSPACE_ID,
      WORKSPACE_MEMBER_ID,
    );

    expect(result.success).toBe(true);
    expect(result.verificationScore).toBe(100);
    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.selfieStatus).toBe('CLEAR');
    expect(result.locationStatus).toBe('WITHIN_RANGE');
    expect(result.imageReused).toBe(false);
    expect(result.selfieUrl).toBe('visit-selfie/visit-abc-123.jpg');
    expect(result.issues).toHaveLength(0);
  });

  it('sets NEEDS_REVIEW when location is suspicious but score is not UNVERIFIED', async () => {
    mockGpsService.verifyLocation.mockReturnValue({
      distanceFromClinic: 5,
      locationStatus: 'SUSPICIOUS',
      isSuspicious: true,
    });

    mockScoringService.computeScore.mockReturnValue({
      score: 80,
      verificationStatus: 'PARTIALLY_VERIFIED',
      breakdown: {},
    });

    const result = await service.verifyVisit(
      { ...baseInput, isMockLocation: true },
      WORKSPACE_ID,
      WORKSPACE_MEMBER_ID,
    );

    expect(result.verificationStatus).toBe('NEEDS_REVIEW');
  });

  // ─── Selfie storage failure ───────────────────────────────────────────────────

  it('continues and records issue when selfie storage fails', async () => {
    mockStorageService.storeSelfie.mockRejectedValue(
      new Error('Storage unavailable'),
    );

    const result = await service.verifyVisit(
      baseInput,
      WORKSPACE_ID,
      WORKSPACE_MEMBER_ID,
    );

    expect(result.selfieUrl).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('Selfie storage failed')]),
    );
  });
});
