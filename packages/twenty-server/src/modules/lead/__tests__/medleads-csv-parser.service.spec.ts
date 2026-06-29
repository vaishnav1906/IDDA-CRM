import { MedleadsImportExceptionCode } from 'src/modules/lead/exceptions/medleads-import-exception-code.enum';
import { MedleadsImportException } from 'src/modules/lead/exceptions/medleads-import.exception';
import { MedleadsCsvParserService } from 'src/modules/lead/services/medleads-csv-parser.service';

const makeBuffer = (content: string) => Buffer.from(content, 'utf-8');

describe('MedleadsCsvParserService', () => {
  let service: MedleadsCsvParserService;

  beforeEach(() => {
    service = new MedleadsCsvParserService();
  });

  describe('parse', () => {
    it('should parse a well-formed CSV and return normalised rows', () => {
      const csv = [
        'Clinic Name,Doctor Name,Phone,City,Rating,Maps URL',
        'Sharma Dental,Dr. Amit Sharma,9876543210,Mumbai,4.5,https://maps.google.com/?cid=1',
      ].join('\n');

      const rows = service.parse(makeBuffer(csv));

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        clinicName: 'Sharma Dental',
        doctorName: 'Dr. Amit Sharma',
        phone: '9876543210',
        city: 'Mumbai',
        rating: '4.5',
        mapsUrl: 'https://maps.google.com/?cid=1',
      });
    });

    it('should accept alternative column header casing and aliases', () => {
      const csv = [
        'clinic name,DOCTOR NAME,PHONE NUMBER,MAPS URL',
        'ABC Clinic,Dr. B,1234567890,https://maps.google.com/?cid=2',
      ].join('\n');

      const rows = service.parse(makeBuffer(csv));

      expect(rows[0]).toMatchObject({
        clinicName: 'ABC Clinic',
        doctorName: 'Dr. B',
        phone: '1234567890',
        mapsUrl: 'https://maps.google.com/?cid=2',
      });
    });

    it('should skip empty values (field is absent from result)', () => {
      const csv = ['Clinic Name,Phone', 'XYZ Clinic,'].join('\n');

      const rows = service.parse(makeBuffer(csv));

      expect(rows[0].clinicName).toBe('XYZ Clinic');
      expect(rows[0].phone).toBeUndefined();
    });

    it('should ignore unknown columns silently', () => {
      const csv = [
        'Clinic Name,Unknown Column',
        'Test Clinic,some_value',
      ].join('\n');

      const rows = service.parse(makeBuffer(csv));

      expect(rows[0].clinicName).toBe('Test Clinic');
      expect(Object.keys(rows[0])).not.toContain('Unknown Column');
    });

    it('should throw EMPTY_FILE for an empty buffer', () => {
      expect(() => service.parse(makeBuffer(''))).toThrow(
        expect.objectContaining({
          code: MedleadsImportExceptionCode.EMPTY_FILE,
        }),
      );
    });

    it('should throw EMPTY_FILE when only a header row is present', () => {
      const csv = 'Clinic Name,Phone\n';

      expect(() => service.parse(makeBuffer(csv))).toThrow(
        expect.objectContaining({
          code: MedleadsImportExceptionCode.EMPTY_FILE,
        }),
      );
    });

    it('should parse multiple rows', () => {
      const csv = [
        'Clinic Name,City',
        'Clinic A,Delhi',
        'Clinic B,Pune',
        'Clinic C,Bangalore',
      ].join('\n');

      const rows = service.parse(makeBuffer(csv));

      expect(rows).toHaveLength(3);
      expect(rows[2].clinicName).toBe('Clinic C');
    });

    it('should trim leading and trailing whitespace from values', () => {
      const csv = ['Clinic Name,City', '  Padded Clinic  ,  Hyderabad  '].join(
        '\n',
      );

      const rows = service.parse(makeBuffer(csv));

      expect(rows[0].clinicName).toBe('Padded Clinic');
      expect(rows[0].city).toBe('Hyderabad');
    });

    it('should handle Windows CRLF line endings', () => {
      const csv = 'Clinic Name,City\r\nCRLF Clinic,Chennai\r\n';

      const rows = service.parse(makeBuffer(csv));

      expect(rows).toHaveLength(1);
      expect(rows[0].clinicName).toBe('CRLF Clinic');
    });
  });
});
