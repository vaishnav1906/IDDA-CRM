import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Injectable,
} from '@nestjs/common';

import { type Response } from 'express';
import { assertUnreachable } from 'twenty-shared/utils';

import { HttpExceptionHandlerService } from 'src/engine/core-modules/exception-handler/http-exception-handler.service';
import { MedleadsImportExceptionCode } from 'src/modules/lead/exceptions/medleads-import-exception-code.enum';
import { MedleadsImportException } from 'src/modules/lead/exceptions/medleads-import.exception';
import { type CustomException } from 'src/utils/custom-exception';

@Injectable()
@Catch(MedleadsImportException)
export class MedleadsImportRestApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpExceptionHandlerService: HttpExceptionHandlerService,
  ) {}

  catch(exception: MedleadsImportException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case MedleadsImportExceptionCode.INVALID_FILE:
      case MedleadsImportExceptionCode.EMPTY_FILE:
      case MedleadsImportExceptionCode.PARSE_ERROR:
        return this.httpExceptionHandlerService.handleError(
          exception as CustomException,
          response,
          400,
        );
      case MedleadsImportExceptionCode.IMPORT_FAILED:
        return this.httpExceptionHandlerService.handleError(
          exception as CustomException,
          response,
          500,
        );
      default:
        assertUnreachable(exception.code);
    }
  }
}
