import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { FileFolder } from 'twenty-shared/types';

import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { VisitClinicPhotoService } from 'src/modules/idda-visit-verification/services/visit-clinic-photo.service';
import { VisitClinicPhotoStorageService } from 'src/modules/idda-visit-verification/services/visit-clinic-photo-storage.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WORKSPACE_ID = 'ws-photo-001';
const VISIT_ID = 'visit-photo-abc';
const STORED_PATH = `clinic-photo/${VISIT_ID}.jpg`;
// signFileByIdUrl returns the standard /file/clinic-photo/ URL; the service
// rewrites it to /visit-clinic-photo/ for direct disk serving.
const RAW_SIGNED_URL = `http://localhost:3000/file/clinic-photo/${VISIT_ID}?token=tok`;
const SIGNED_URL = `http://localhost:3000/visit-clinic-photo/${VISIT_ID}?token=tok`;

/** Returns a minimal valid JPEG as base64. */
function makeJpegBase64(sizeBytes = 4096): string {
  const buf = Buffer.alloc(sizeBytes, 0);

  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;

  return buf.toString('base64');
}

// ─── Shared mock factory ──────────────────────────────────────────────────────

function makeVisitRepo(affected = 1) {
  return {
    findOne: jest.fn().mockResolvedValue({
      id: VISIT_ID,
      clinicPhoto: STORED_PATH,
    }),
    update: jest.fn().mockResolvedValue({ affected }),
  };
}

function makeOrmManager(visitRepo: ReturnType<typeof makeVisitRepo>) {
  return {
    executeInWorkspaceContext: jest
      .fn()
      .mockImplementation((fn: () => unknown) => fn()),
    getRepository: jest.fn().mockResolvedValue(visitRepo),
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('VisitClinicPhotoService', () => {
  let service: VisitClinicPhotoService;
  let mockOrmManager: ReturnType<typeof makeOrmManager>;
  let mockStorageService: { storePhoto: jest.Mock };
  let mockFileUrlService: { signFileByIdUrl: jest.Mock };
  let visitRepo: ReturnType<typeof makeVisitRepo>;

  beforeEach(async () => {
    visitRepo = makeVisitRepo();
    mockOrmManager = makeOrmManager(visitRepo);

    mockStorageService = {
      storePhoto: jest.fn().mockResolvedValue(STORED_PATH),
    };

    // signFileByIdUrl returns the raw /file/clinic-photo/ URL; the service
    // replaces it with /visit-clinic-photo/ before returning.
    mockFileUrlService = {
      signFileByIdUrl: jest.fn().mockResolvedValue(RAW_SIGNED_URL),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitClinicPhotoService,
        { provide: GlobalWorkspaceOrmManager, useValue: mockOrmManager },
        {
          provide: VisitClinicPhotoStorageService,
          useValue: mockStorageService,
        },
        { provide: FileUrlService, useValue: mockFileUrlService },
      ],
    }).compile();

    service = module.get(VisitClinicPhotoService);
  });

  // ─── uploadClinicPhoto: success path ─────────────────────────────────────────

  describe('uploadClinicPhoto', () => {
    it('writes the photo to disk and returns the stored path', async () => {
      const result = await service.uploadClinicPhoto(
        VISIT_ID,
        makeJpegBase64(),
        WORKSPACE_ID,
      );

      expect(mockStorageService.storePhoto).toHaveBeenCalledTimes(1);
      expect(result).toBe(STORED_PATH);
    });

    it('enters workspace context before obtaining the visit repository', async () => {
      await service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID);

      expect(mockOrmManager.executeInWorkspaceContext).toHaveBeenCalledTimes(1);
      // getRepository must be called inside the executeInWorkspaceContext callback
      expect(mockOrmManager.getRepository).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'visit',
        { shouldBypassPermissionChecks: true },
      );
    });

    it('updates visit.clinicPhoto in the database', async () => {
      await service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID);

      expect(visitRepo.update).toHaveBeenCalledWith(
        { id: VISIT_ID },
        { clinicPhoto: STORED_PATH },
      );
    });

    it('reports affected=1 and succeeds', async () => {
      // Default visitRepo has affected=1 — should resolve without throwing.
      await expect(
        service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID),
      ).resolves.toBe(STORED_PATH);
    });

    // ── Missing visit ────────────────────────────────────────────────────────

    it('throws BadRequestException when visit is not found (affected=0)', async () => {
      const repoWithNoAffected = makeVisitRepo(0);

      mockOrmManager.getRepository.mockResolvedValue(repoWithNoAffected);

      await expect(
        service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('error message for missing visit contains the visitId', async () => {
      const repoWithNoAffected = makeVisitRepo(0);

      mockOrmManager.getRepository.mockResolvedValue(repoWithNoAffected);

      await expect(
        service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID),
      ).rejects.toMatchObject({ message: expect.stringContaining(VISIT_ID) });
    });

    // ── ORM failure propagation ──────────────────────────────────────────────

    it('propagates ORM update exception to the caller — does not swallow it', async () => {
      const ormError = new Error('DB connection lost');
      const brokenRepo = {
        update: jest.fn().mockRejectedValue(ormError),
      };

      mockOrmManager.getRepository.mockResolvedValue(brokenRepo);

      await expect(
        service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID),
      ).rejects.toThrow('DB connection lost');
    });

    it('does not return success when ORM throws — error escapes to caller', async () => {
      mockOrmManager.executeInWorkspaceContext.mockRejectedValue(
        new Error('Context failure'),
      );

      await expect(
        service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID),
      ).rejects.toThrow();
    });

    // ── Base64 size guard ────────────────────────────────────────────────────

    it('throws BadRequestException when photo exceeds 10 MB', async () => {
      const oversized = 'A'.repeat(10 * 1024 * 1024 + 1);

      await expect(
        service.uploadClinicPhoto(VISIT_ID, oversized, WORKSPACE_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not call storePhoto when size guard rejects', async () => {
      const oversized = 'A'.repeat(10 * 1024 * 1024 + 1);

      await expect(
        service.uploadClinicPhoto(VISIT_ID, oversized, WORKSPACE_ID),
      ).rejects.toThrow();

      expect(mockStorageService.storePhoto).not.toHaveBeenCalled();
    });

    // ── Disk-write failure ───────────────────────────────────────────────────

    it('propagates storage error to caller when disk write fails', async () => {
      mockStorageService.storePhoto.mockRejectedValue(new Error('Disk full'));

      await expect(
        service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID),
      ).rejects.toThrow('Disk full');
    });

    it('does not call ORM when disk write fails', async () => {
      mockStorageService.storePhoto.mockRejectedValue(new Error('Disk full'));

      await expect(
        service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), WORKSPACE_ID),
      ).rejects.toThrow();

      expect(mockOrmManager.executeInWorkspaceContext).not.toHaveBeenCalled();
    });

    // ── data-URI prefix stripping ────────────────────────────────────────────

    it('strips data-URI prefix and uploads successfully', async () => {
      const dataUri = `data:image/jpeg;base64,${makeJpegBase64()}`;
      const result = await service.uploadClinicPhoto(VISIT_ID, dataUri, WORKSPACE_ID);

      expect(result).toBe(STORED_PATH);
      expect(mockStorageService.storePhoto).toHaveBeenCalledTimes(1);
    });

    // ── PNG detection ────────────────────────────────────────────────────────

    it('detects image/png from data-URI prefix', async () => {
      const pngBuf = Buffer.alloc(4096, 0);

      pngBuf[0] = 0x89;
      pngBuf[1] = 0x50;
      pngBuf[2] = 0x4e;
      pngBuf[3] = 0x47;
      const dataUri = `data:image/png;base64,${pngBuf.toString('base64')}`;

      await service.uploadClinicPhoto(VISIT_ID, dataUri, WORKSPACE_ID);

      expect(mockStorageService.storePhoto).toHaveBeenCalledWith(
        expect.any(Buffer),
        'image/png',
        WORKSPACE_ID,
        VISIT_ID,
      );
    });

    // ── Workspace isolation ──────────────────────────────────────────────────

    it('passes the correct workspaceId to storePhoto and getRepository', async () => {
      const otherWs = 'ws-other-999';
      const otherRepo = makeVisitRepo();

      mockOrmManager.getRepository.mockResolvedValue(otherRepo);

      await service.uploadClinicPhoto(VISIT_ID, makeJpegBase64(), otherWs);

      expect(mockStorageService.storePhoto).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(String),
        otherWs,
        VISIT_ID,
      );
      expect(mockOrmManager.getRepository).toHaveBeenCalledWith(
        otherWs,
        'visit',
        { shouldBypassPermissionChecks: true },
      );
    });
  });

  // ─── getClinicPhotoUrl ────────────────────────────────────────────────────────

  describe('getClinicPhotoUrl', () => {
    it('returns a signed URL pointing to /visit-clinic-photo/ (not /file/)', async () => {
      const url = await service.getClinicPhotoUrl(VISIT_ID, WORKSPACE_ID);

      expect(url).toBe(SIGNED_URL);
      expect(url).toContain('/visit-clinic-photo/');
      expect(url).not.toContain('/file/clinic-photo/');
    });

    it('calls signFileByIdUrl with the visit UUID as fileId', async () => {
      await service.getClinicPhotoUrl(VISIT_ID, WORKSPACE_ID);

      expect(mockFileUrlService.signFileByIdUrl).toHaveBeenCalledWith({
        fileId: VISIT_ID,
        workspaceId: WORKSPACE_ID,
        fileFolder: FileFolder.ClinicPhoto,
      });
    });

    it('preserves the token query param through the URL rewrite', async () => {
      const url = await service.getClinicPhotoUrl(VISIT_ID, WORKSPACE_ID);

      expect(url).toContain('?token=tok');
    });

    it('returns null when visit is not found', async () => {
      const repoNotFound = { findOne: jest.fn().mockResolvedValue(null) };

      mockOrmManager.getRepository.mockResolvedValue(repoNotFound);

      const url = await service.getClinicPhotoUrl(VISIT_ID, WORKSPACE_ID);

      expect(url).toBeNull();
    });

    it('returns null when clinicPhoto is null', async () => {
      const repoNullPhoto = {
        findOne: jest.fn().mockResolvedValue({ id: VISIT_ID, clinicPhoto: null }),
      };

      mockOrmManager.getRepository.mockResolvedValue(repoNullPhoto);

      const url = await service.getClinicPhotoUrl(VISIT_ID, WORKSPACE_ID);

      expect(url).toBeNull();
    });

    it('enters workspace context before the visit lookup', async () => {
      await service.getClinicPhotoUrl(VISIT_ID, WORKSPACE_ID);

      expect(mockOrmManager.executeInWorkspaceContext).toHaveBeenCalledTimes(1);
    });

    it('returns null (not throws) when ORM throws internally', async () => {
      mockOrmManager.executeInWorkspaceContext.mockRejectedValue(
        new Error('ORM error'),
      );

      const url = await service.getClinicPhotoUrl(VISIT_ID, WORKSPACE_ID);

      expect(url).toBeNull();
    });
  });
});
