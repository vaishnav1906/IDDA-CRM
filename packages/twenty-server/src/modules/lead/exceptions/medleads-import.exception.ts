import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { CustomException } from 'src/utils/custom-exception';
import { MedleadsImportExceptionCode } from 'src/modules/lead/exceptions/medleads-import-exception-code.enum';

const getMedleadsImportExceptionUserFriendlyMessage = (
  code: MedleadsImportExceptionCode,
) => {
  switch (code) {
    case MedleadsImportExceptionCode.INVALID_FILE:
      return msg`The uploaded file is not a valid CSV.`;
    case MedleadsImportExceptionCode.EMPTY_FILE:
      return msg`The uploaded CSV file contains no data rows.`;
    case MedleadsImportExceptionCode.PARSE_ERROR:
      return msg`The CSV file could not be parsed.`;
    case MedleadsImportExceptionCode.IMPORT_FAILED:
      return msg`The import failed due to an internal error.`;
    default:
      assertUnreachable(code);
  }
};

export class MedleadsImportException extends CustomException<MedleadsImportExceptionCode> {
  constructor(message: string, code: MedleadsImportExceptionCode) {
    super(message, code, {
      userFriendlyMessage: getMedleadsImportExceptionUserFriendlyMessage(code),
    });
  }
}
