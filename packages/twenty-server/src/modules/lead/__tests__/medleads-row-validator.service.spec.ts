import { type MedleadsImportRowDto } from 'src/modules/lead/dtos/medleads-import-row.dto';
import { MedleadsRowValidatorService } from 'src/modules/lead/services/medleads-row-validator.service';

const validRow: MedleadsImportRowDto = {
  clinicName: 'Sharma Dental',
  doctorName: 'Dr. Amit Sharma',
  phone: '9876543210',
  city: 'Mumbai',
  state: 'Maharashtra',
  rating: '4.5',
  reviews: '120',
  mapsUrl: 'https://maps.google.com/?cid=1',
};

describe('MedleadsRowValidatorService', () => {
  let service: MedleadsRowValidatorService;

  beforeEach(() => {
    service = new MedleadsRowValidatorService();
  });

  describe('validate', () => {
    it('should return isValid:true for a well-formed row', () => {
      const result = service.validate(validRow);

      expect(result.isValid).toBe(true);

      if (result.isValid) {
        expect(result.row.clinicName).toBe('Sharma Dental');
        expect(result.row.rating).toBe(4.5);
        expect(result.row.reviews).toBe(120);
      }
    });

    it('should return isValid:false when clinicName is absent', () => {
      const row: MedleadsImportRowDto = { phone: '9876543210' };
      const result = service.validate(row);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.reason).toContain('Clinic Name');
      }
    });

    it('should return isValid:false when clinicName is empty string', () => {
      const row: MedleadsImportRowDto = { clinicName: '' };
      const result = service.validate(row);

      expect(result.isValid).toBe(false);
    });

    it('should return isValid:false for a non-numeric rating', () => {
      const row: MedleadsImportRowDto = { ...validRow, rating: 'excellent' };
      const result = service.validate(row);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.reason).toContain('Rating');
      }
    });

    it('should return isValid:false for a rating above 5', () => {
      const row: MedleadsImportRowDto = { ...validRow, rating: '6' };
      const result = service.validate(row);

      expect(result.isValid).toBe(false);
    });

    it('should return isValid:false for a rating below 0', () => {
      const row: MedleadsImportRowDto = { ...validRow, rating: '-1' };
      const result = service.validate(row);

      expect(result.isValid).toBe(false);
    });

    it('should return isValid:false for a non-numeric reviews count', () => {
      const row: MedleadsImportRowDto = { ...validRow, reviews: 'many' };
      const result = service.validate(row);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.reason).toContain('Reviews');
      }
    });

    it('should return isValid:false for an invalid importedAt date', () => {
      const row: MedleadsImportRowDto = { ...validRow, importedAt: 'not-a-date' };
      const result = service.validate(row);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.reason).toContain('Imported At');
      }
    });

    it('should return isValid:false for an invalid extractedAt date', () => {
      const row: MedleadsImportRowDto = {
        ...validRow,
        extractedAt: 'not-a-date',
      };
      const result = service.validate(row);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.reason).toContain('Extracted At');
      }
    });

    it('should set null for optional fields that are absent', () => {
      const row: MedleadsImportRowDto = { clinicName: 'Minimal Clinic' };
      const result = service.validate(row);

      expect(result.isValid).toBe(true);

      if (result.isValid) {
        expect(result.row.doctorName).toBeNull();
        expect(result.row.phone).toBeNull();
        expect(result.row.rating).toBeNull();
        expect(result.row.mapsUrl).toBeNull();
        expect(result.row.importedAt).toBeNull();
      }
    });

    it('should parse valid ISO date strings', () => {
      const row: MedleadsImportRowDto = {
        clinicName: 'Date Clinic',
        importedAt: '2024-03-15T10:30:00Z',
        extractedAt: '2024-03-14',
      };

      const result = service.validate(row);

      expect(result.isValid).toBe(true);

      if (result.isValid) {
        expect(result.row.importedAt).toBeInstanceOf(Date);
        expect(result.row.extractedAt).toBeInstanceOf(Date);
      }
    });

    it('should accept rating of exactly 0 and exactly 5', () => {
      const zeroResult = service.validate({ ...validRow, rating: '0' });
      const fiveResult = service.validate({ ...validRow, rating: '5' });

      expect(zeroResult.isValid).toBe(true);
      expect(fiveResult.isValid).toBe(true);
    });
  });
});
