export class NCalcError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NCalcRuntimeError extends NCalcError {}
