import { type MedleadsImportResultDto } from 'src/modules/lead/dtos/medleads-import-result.dto';
import { MedleadsImportExceptionCode } from 'src/modules/lead/exceptions/medleads-import-exception-code.enum';
import { MedleadsCsvParserService } from 'src/modules/lead/services/medleads-csv-parser.service';
import { MedleadsImportService } from 'src/modules/lead/services/medleads-import.service';
import { MedleadsRowValidatorService } from 'src/modules/lead/services/medleads-row-validator.service';

const WORKSPACE_ID = 'workspace-test-id';

// ---- Minimal repository mock ----
const mockSave = jest.fn();
const mockFind = jest.fn();

const mockLeadRepository = {
  find: mockFind,
  save: mockSave,
};

// ---- GlobalWorkspaceOrmManager mock ----
const mockGetRepository = jest.fn().mockResolvedValue(mockLeadRepository);
const mockExecuteInWorkspaceContext = jest.fn(
  async (fn: () => Promise<unknown>) => fn(),
);

const mockGlobalWorkspaceOrmManager = {
  getRepository: mockGetRepository,
  executeInWorkspaceContext: mockExecuteInWorkspaceContext,
};

// ---- workspace auth context mock ----
jest.mock(
  'src/engine/core-modules/auth/storage/workspace-auth-context.storage',
  () => ({
    getWorkspaceAuthContext: () => ({
      workspace: { id: WORKSPACE_ID },
      type: 'user',
    }),
  }),
);

const makeBuffer = (content: string) => Buffer.from(content, 'utf-8');

describe('MedleadsImportService', () => {
  let service: MedleadsImportService;
  let csvParser: MedleadsCsvParserService;
  let rowValidator: MedleadsRowValidatorService;

  beforeEach(() => {
    // resetAllMocks clears call history AND the once-queue, preventing bleed
    jest.resetAllMocks();
    mockFind.mockResolvedValue([]);
    mockSave.mockResolvedValue([]);
    mockGetRepository.mockResolvedValue(mockLeadRepository);
    mockExecuteInWorkspaceContext.mockImplementation(
      async (fn: () => Promise<unknown>) => fn(),
    );

    csvParser = new MedleadsCsvParserService();
    rowValidator = new MedleadsRowValidatorService();
    service = new MedleadsImportService(
      csvParser,
      rowValidator,
      mockGlobalWorkspaceOrmManager as never,
    );
  });

  describe('importFromBuffer', () => {
    it('should import valid rows and return the correct summary', async () => {
      const csv = [
        'Clinic Name,Phone,City,Maps URL',
        'Sharma Dental,9876543210,Mumbai,https://maps.google.com/?cid=1',
        'Kumar Clinic,8765432109,Delhi,https://maps.google.com/?cid=2',
      ].join('\n');

      const result: MedleadsImportResultDto = await service.importFromBuffer(
        makeBuffer(csv),
      );

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.failedRows).toHaveLength(0);
      expect(mockSave).toHaveBeenCalledTimes(1);

      const savedEntities = mockSave.mock.calls[0][0] as Array<unknown>;

      expect(savedEntities).toHaveLength(2);
    });

    it('should skip invalid rows and report them without aborting', async () => {
      const csv = [
        'Clinic Name,Rating',
        'Valid Clinic,4.5',
        ',3.0', // missing clinic name — invalid
        'Another Clinic,six', // non-numeric rating — invalid
      ].join('\n');

      const result = await service.importFromBuffer(makeBuffer(csv));

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.failedRows).toHaveLength(2);
      expect(result.failedRows[0].rowIndex).toBe(3); // row 2 in file (1-indexed, header=1)
      expect(result.failedRows[1].rowIndex).toBe(4);
    });

    it('should deduplicate by mapsUrl when present', async () => {
      mockFind.mockResolvedValueOnce([
        { mapsUrl: 'https://maps.google.com/?cid=1' },
      ]);

      const csv = [
        'Clinic Name,Maps URL',
        'Existing Clinic,https://maps.google.com/?cid=1',
        'New Clinic,https://maps.google.com/?cid=2',
      ].join('\n');

      const result = await service.importFromBuffer(makeBuffer(csv));

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);

      const savedEntities = mockSave.mock.calls[0][0] as Array<{ clinicName: string }>;

      expect(savedEntities[0].clinicName).toBe('New Clinic');
    });

    it('should deduplicate by clinicName + phone when mapsUrl is absent', async () => {
      // No mapsUrl column → no mapsUrl query fires.
      // Both rows have phone → clinicNamePhone query fires (one call).
      // Both rows have phone → clinicNameCity filter excludes them → no city query.
      mockFind.mockResolvedValueOnce([
        { clinicName: 'Duplicate Clinic', phone: '9999999999' },
      ]);

      const csv = [
        'Clinic Name,Phone,City',
        'Duplicate Clinic,9999999999,Mumbai',
        'Unique Clinic,8888888888,Delhi',
      ].join('\n');

      const result = await service.importFromBuffer(makeBuffer(csv));

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should deduplicate by clinicName + city as last resort', async () => {
      // No mapsUrl → no mapsUrl query. No phone → no clinicNamePhone query.
      // Only city dedup query fires (one call).
      mockFind.mockResolvedValueOnce([{ clinicName: 'City Clinic', city: 'Pune' }]);

      const csv = [
        'Clinic Name,City',
        'City Clinic,Pune',
        'Other Clinic,Pune',
      ].join('\n');

      const result = await service.importFromBuffer(makeBuffer(csv));

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should set importedAt to current time when not provided in row', async () => {
      const before = new Date();
      const csv = ['Clinic Name,City', 'Auto Date Clinic,Delhi'].join('\n');

      await service.importFromBuffer(makeBuffer(csv));

      const after = new Date();
      const savedEntities = mockSave.mock.calls[0][0] as Array<{
        importedAt: Date;
      }>;

      expect(savedEntities[0].importedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(savedEntities[0].importedAt.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('should map website URL to LinksMetadata shape', async () => {
      const csv = [
        'Clinic Name,Website',
        'Web Clinic,https://example.com',
      ].join('\n');

      await service.importFromBuffer(makeBuffer(csv));

      const savedEntities = mockSave.mock.calls[0][0] as Array<{
        website: { primaryLinkUrl: string; primaryLinkLabel: string };
      }>;

      expect(savedEntities[0].website).toMatchObject({
        primaryLinkUrl: 'https://example.com',
        primaryLinkLabel: '',
        secondaryLinks: null,
      });
    });

    it('should set status to NEW on every imported row', async () => {
      const csv = ['Clinic Name,City', 'Status Clinic,Kolkata'].join('\n');

      await service.importFromBuffer(makeBuffer(csv));

      const savedEntities = mockSave.mock.calls[0][0] as Array<{
        status: string;
      }>;

      expect(savedEntities[0].status).toBe('NEW');
    });

    it('should set createdBy.source to IMPORT', async () => {
      const csv = ['Clinic Name,City', 'Actor Clinic,Jaipur'].join('\n');

      await service.importFromBuffer(makeBuffer(csv));

      const savedEntities = mockSave.mock.calls[0][0] as Array<{
        createdBy: { source: string };
      }>;

      expect(savedEntities[0].createdBy.source).toBe('IMPORT');
    });

    it('should throw EMPTY_FILE when the CSV has no data rows', async () => {
      await expect(
        service.importFromBuffer(makeBuffer('')),
      ).rejects.toMatchObject({
        code: MedleadsImportExceptionCode.EMPTY_FILE,
      });
    });

    it('should return zero imported when all rows fail validation', async () => {
      // All rows have empty clinicName (the only required field)
      const csv = ['Clinic Name,City', ',Delhi', ',Mumbai', ',Pune'].join('\n');

      const result = await service.importFromBuffer(makeBuffer(csv));

      expect(result.imported).toBe(0);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should not call save when all valid rows are duplicates', async () => {
      mockFind.mockResolvedValue([
        { mapsUrl: 'https://maps.google.com/?cid=dup' },
      ]);

      const csv = [
        'Clinic Name,Maps URL',
        'Dup Clinic,https://maps.google.com/?cid=dup',
      ].join('\n');

      const result = await service.importFromBuffer(makeBuffer(csv));

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockSave).not.toHaveBeenCalled();
    });
  });
});
