import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';

import { Response } from 'express';

import { DecisionRegisterException } from 'src/engine/core-modules/decision-register/exceptions/decision-register.exception';
import { DecisionRegisterExceptionCode } from 'src/engine/core-modules/decision-register/exceptions/decision-register-exception-code.enum';

@Catch(DecisionRegisterException)
export class DecisionRegisterRestApiExceptionFilter
  implements ExceptionFilter
{
  catch(exception: DecisionRegisterException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusMap: Record<DecisionRegisterExceptionCode, HttpStatus> = {
      [DecisionRegisterExceptionCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
      [DecisionRegisterExceptionCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
      [DecisionRegisterExceptionCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
    };

    const status = statusMap[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      error: exception.code,
      message: exception.message,
    });
  }
}
