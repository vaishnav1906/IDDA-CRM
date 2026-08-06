import {
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { type MedleadsImportResultDto } from 'src/modules/lead/dtos/medleads-import-result.dto';
import { MedleadsImportExceptionCode } from 'src/modules/lead/exceptions/medleads-import-exception-code.enum';
import { MedleadsImportException } from 'src/modules/lead/exceptions/medleads-import.exception';
import { MedleadsImportRestApiExceptionFilter } from 'src/modules/lead/filters/medleads-import-rest-api-exception.filter';
import { MedleadsImportService } from 'src/modules/lead/services/medleads-import.service';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Inline type avoids a dependency on @types/multer while preserving the shape
// expected by NestJS FileInterceptor + UploadedFile decorator.
type UploadedMulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller('rest/leads')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, NoPermissionGuard)
@UseFilters(MedleadsImportRestApiExceptionFilter)
export class MedleadsImportController {
  constructor(
    private readonly medleadsImportService: MedleadsImportService,
  ) {}

  @Post('import')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  async importCsv(
    @UploadedFile() file: UploadedMulterFile | undefined,
  ): Promise<MedleadsImportResultDto> {
    if (!file) {
      throw new MedleadsImportException(
        'No file uploaded. Attach a CSV as form field "file".',
        MedleadsImportExceptionCode.INVALID_FILE,
      );
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new MedleadsImportException(
        `File "${file.originalname}" does not appear to be a CSV.`,
        MedleadsImportExceptionCode.INVALID_FILE,
      );
    }

    return this.medleadsImportService.importFromBuffer(file.buffer);
  }
}
