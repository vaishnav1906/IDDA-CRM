import { DecisionRegisterExceptionCode } from 'src/engine/core-modules/decision-register/exceptions/decision-register-exception-code.enum';

export class DecisionRegisterException extends Error {
  constructor(
    message: string,
    public readonly code: DecisionRegisterExceptionCode,
  ) {
    super(message);
    this.name = 'DecisionRegisterException';
  }
}
