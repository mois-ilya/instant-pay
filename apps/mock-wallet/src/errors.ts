export abstract class InstantPayError extends Error {
  abstract readonly name: string;
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InstantPayInvalidParamsError extends InstantPayError {
  readonly name = 'InstantPayInvalidParamsError';
  constructor(message: string = 'Invalid parameters provided to setPayButton()') {
    super(message);
  }
}

