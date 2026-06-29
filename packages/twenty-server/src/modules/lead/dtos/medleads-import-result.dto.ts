import { type MedleadsFailedRowDto } from 'src/modules/lead/dtos/medleads-import-row.dto';

export type MedleadsImportResultDto = {
  imported: number;
  skipped: number;
  failed: number;
  failedRows: MedleadsFailedRowDto[];
};
