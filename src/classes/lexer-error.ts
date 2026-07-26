import { NCalcError } from "./ncalc-error";
import type { SourceRegion } from "./source-region";

export type LexerErrorCode =
  | "lexer.unrecognized-input"
  | "lexer.invalid-number"
  | "lexer.expected-end-of-date"
  | "lexer.expected-start-of-string"
  | "lexer.expected-end-of-string"
  | "lexer.expected-end-of-escaped-character"
  | "lexer.unrecognized-operator"
  | "lexer.expected-parameter-close";

export class LexerError extends NCalcError {
  public readonly code: LexerErrorCode;
  public readonly location: SourceRegion | null;

  constructor(
    code: LexerErrorCode,
    message: string,
    location: SourceRegion | null,
  ) {
    super(message);
    Object.setPrototypeOf(this, LexerError.prototype);
    this.code = code;
    this.location = location;
  }

  get where(): SourceRegion | null {
    return this.location;
  }

  get detailedMessage(): string {
    if (this.location === null) {
      return this.message;
    }

    return `${this.message} at line ${this.location.line.toString()}, column ${this.location.column.toString()}`;
  }
}
