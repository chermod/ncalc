import { SourceRegion } from "./source-region";
import { NCalcError } from "./ncalc-error";
import {
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE,
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING,
  LEXER_ERROR_MESSAGE_UNRECOGNISED_OPERATOR,
  lexerErrorMessageExpectedParameterClose,
  lexerErrorMessageInvalidNumber,
  lexerErrorMessageUnrecognisedInput,
} from "./lexer-messages";

export type TokenType =
  | "group-open"
  | "group-close"
  | "separator"
  | "colon"
  | "parameter"
  | "boolean"
  | "string"
  | "number"
  | "date"
  | "identifier"
  | "logical-and"
  | "more-than"
  | "less-than"
  | "less-than-or-equal"
  | "more-than-or-equal"
  | "not-equal"
  | "logical-not"
  | "equals"
  | "minus"
  | "bit-or"
  | "exp"
  | "bit-xor"
  | "bit-and"
  | "shift-right"
  | "shift-left"
  | "plus"
  | "times"
  | "ternary"
  | "logical-or"
  | "division"
  | "modulus"
  | "complement"
  | "in"
  | "not"
  | "like";

export type Token = {
  type: TokenType;
  value: string;
  location: SourceRegion;
};

type TokenWithoutLocation = Omit<Token, "location">;

type LexerPosition = {
  index: number;
  line: number;
  column: number;
};

export type LexerErrorCode =
  | "lexer.unrecognised-input"
  | "lexer.invalid-number"
  | "lexer.expected-end-of-date"
  | "lexer.expected-start-of-string"
  | "lexer.expected-end-of-string"
  | "lexer.expected-end-of-escaped-character"
  | "lexer.unrecognised-operator"
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

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `${this.message} at line ${this.location.line}, column ${this.location.column}`;
  }
}

export class Lexer {
  readonly #input: string;
  #index: number = 0;
  #line: number = 1;
  #column: number = 1;
  #nextToken: null | Token = null;
  #currentToken: null | Token = null;

  constructor(input: string) {
    this.#input = input;
  }

  peek(): Token | null {
    if (this.#nextToken !== null) return this.#nextToken;
    return (this.#nextToken = this.#getNext());
  }

  next(): Token | null {
    this.#currentToken = this.peek();
    this.#nextToken = this.#getNext();
    return this.#currentToken;
  }

  #getNext(): Token | null {
    this.#skipWhitespace();
    const tokenStart = this.#position();
    const nextCharacter = this.#peekChar();

    if (nextCharacter === null) return null;

    if (isNumberStart(nextCharacter)) {
      return this.#region(this.#number(), tokenStart);
    } else if (isStringStart(nextCharacter)) {
      return this.#region(this.#string(), tokenStart);
    } else if (isDateStart(nextCharacter)) {
      return this.#region(this.#date(), tokenStart);
    } else if (isOperatorStart(nextCharacter)) {
      return this.#region(this.#operator(), tokenStart);
    } else if (isGroupOpen(nextCharacter)) {
      return this.#region(this.#groupOpen(), tokenStart);
    } else if (isColon(nextCharacter)) {
      return this.#region(this.#colon(), tokenStart);
    } else if (isGroupClose(nextCharacter)) {
      return this.#region(this.#groupClose(), tokenStart);
    } else if (isParameter(nextCharacter)) {
      return this.#region(this.#parameter(), tokenStart);
    } else if (isSeparator(nextCharacter)) {
      return this.#region(this.#separator(), tokenStart);
    } else if (isIdentifierStart(nextCharacter)) {
      return this.#region(this.#identifier(), tokenStart);
    } else {
      throw new LexerError(
        "lexer.unrecognised-input",
        lexerErrorMessageUnrecognisedInput(nextCharacter),
        new SourceRegion(
          this.#input,
          tokenStart.index,
          1,
          tokenStart.line,
          tokenStart.column,
          tokenStart.line,
          tokenStart.column + 1,
        ),
      );
    }
  }

  #colon(): TokenWithoutLocation {
    this.#nextChar();
    return { type: "colon", value: ":" };
  }

  #date(): TokenWithoutLocation {
    let completeLiteral = "";
    this.#nextChar();
    for (;;) {
      const nextCharacter = this.#peekChar();
      if (nextCharacter === null) {
        throw new LexerError(
          "lexer.expected-end-of-date",
          LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE,
          this.#currentLocation(),
        );
      }
      if (nextCharacter === "#") break;
      completeLiteral += nextCharacter;
      this.#nextChar();
    }

    this.#nextChar();

    return {
      type: "date",
      value: completeLiteral,
    };
  }

  #string(): TokenWithoutLocation {
    const stringStartChar = this.#nextChar();

    let contents = "";

    let withinEscape = false;

    for (;;) {
      const nextCharacter = this.#peekChar();
      if (nextCharacter === null) {
        throw new LexerError(
          "lexer.expected-end-of-string",
          LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING,
          this.#currentLocation(),
        );
      }
      if (nextCharacter === stringStartChar && !withinEscape) break;
      if (
        withinEscape &&
        nextCharacter !== stringStartChar &&
        !["\\", "t", "r", "n", "u"].includes(nextCharacter)
      ) {
        throw new LexerError(
          "lexer.expected-end-of-escaped-character",
          LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
          this.#currentLocation(),
        );
      }

      if (withinEscape && nextCharacter === "n") {
        contents += "\n";
        withinEscape = false;
        this.#nextChar();
      } else if (withinEscape && nextCharacter === "t") {
        contents += "\t";
        withinEscape = false;
        this.#nextChar();
      } else if (withinEscape && nextCharacter === "r") {
        contents += "\r";
        withinEscape = false;
        this.#nextChar();
      } else if (withinEscape && nextCharacter === "u") {
        this.#nextChar();
        contents += this.#unicodeEscape();
        withinEscape = false;
      } else if (!withinEscape && nextCharacter === "\\") {
        withinEscape = true;
        this.#nextChar();
      } else {
        contents += nextCharacter;
        withinEscape = false;
        this.#nextChar();
      }
    }

    this.#nextChar();

    return { type: "string", value: contents };
  }

  #number(): TokenWithoutLocation {
    const completeLiteralStart = this.#index;
    let completeLiteralLength = 0;
    let hasLeadingDigit = false;
    for (;;) {
      const nextCharacter = this.#peekChar();
      if (nextCharacter === null || !isNumber(nextCharacter)) break;
      hasLeadingDigit = true;
      completeLiteralLength++;
      this.#nextChar();
    }

    let hasFractionDigit = false;
    if (this.#peekChar() === ".") {
      this.#nextChar();
      completeLiteralLength++;
    }

    for (;;) {
      const nextCharacter = this.#peekChar();
      if (nextCharacter === null || !isNumber(nextCharacter)) break;
      hasFractionDigit = true;
      completeLiteralLength++;
      this.#nextChar();
    }

    if (!hasLeadingDigit && !hasFractionDigit) {
      throw new LexerError(
        "lexer.invalid-number",
        lexerErrorMessageInvalidNumber(
          this.#input.slice(
            completeLiteralStart,
            completeLiteralStart + completeLiteralLength,
          ),
        ),
        this.#currentLocation(),
      );
    }

    const exponent: string | null = this.#peekChar();
    if (exponent === "e" || exponent === "E") {
      this.#nextChar();
      completeLiteralLength++;

      if (this.#peekChar() === "-") {
        this.#nextChar();
        completeLiteralLength++;
      } else if (this.#peekChar() === "+") {
        this.#nextChar();
        completeLiteralLength++;
      }

      let hasExponentDigit = false;
      for (;;) {
        const nextCharacter = this.#peekChar();
        if (nextCharacter === null || !isNumber(nextCharacter)) break;
        hasExponentDigit = true;
        completeLiteralLength++;
        this.#nextChar();
      }

      if (!hasExponentDigit) {
        throw new LexerError(
          "lexer.invalid-number",
          lexerErrorMessageInvalidNumber(
            this.#input.slice(
              completeLiteralStart,
              completeLiteralStart + completeLiteralLength,
            ),
          ),
          this.#currentLocation(),
        );
      }
    }

    return {
      type: "number",
      value: this.#input.slice(
        completeLiteralStart,
        completeLiteralStart + completeLiteralLength,
      ),
    };
  }

  #operator(): TokenWithoutLocation {
    const operator = this.#nextChar();
    if (operator === null) {
      throw new LexerError(
        "lexer.unrecognised-operator",
        LEXER_ERROR_MESSAGE_UNRECOGNISED_OPERATOR,
        this.#currentLocation(),
      );
    }

    const operatorNext = operatorTrie[operator];
    if (operatorNext === undefined) {
      throw new LexerError(
        "lexer.unrecognised-operator",
        LEXER_ERROR_MESSAGE_UNRECOGNISED_OPERATOR,
        this.#currentLocation(),
      );
    }

    const [firstTokenType, operatorNextMap] = operatorNext;

    const nextCharacter = this.#peekChar();
    if (nextCharacter !== null) {
      const tokenType = operatorNextMap[nextCharacter];
      if (tokenType !== undefined) {
        this.#nextChar();

        return {
          type: tokenType,
          value: operator + nextCharacter,
        };
      }
    }

    return {
      type: firstTokenType,
      value: operator,
    };
  }

  #groupOpen(): TokenWithoutLocation {
    this.#nextChar();
    return { type: "group-open", value: "(" };
  }

  #groupClose(): TokenWithoutLocation {
    this.#nextChar();
    return { type: "group-close", value: ")" };
  }

  #separator(): TokenWithoutLocation {
    this.#nextChar();
    return { type: "separator", value: "," };
  }

  #identifier(): TokenWithoutLocation {
    let identifier = "";
    let nextCharacter = this.#peekChar();
    while (nextCharacter !== null && isIdentifier(nextCharacter)) {
      identifier += nextCharacter;
      this.#nextChar();
      nextCharacter = this.#peekChar();
    }

    const lowerIdentifier = identifier.toLowerCase();

    if (lowerIdentifier === "false" || lowerIdentifier === "true") {
      return {
        type: "boolean",
        value: lowerIdentifier,
      };
    }

    if (lowerIdentifier === "not" || lowerIdentifier === "in") {
      return { type: lowerIdentifier, value: lowerIdentifier };
    }

    if (lowerIdentifier === "or") {
      return { type: "logical-or", value: lowerIdentifier };
    }

    if (lowerIdentifier === "and") {
      return { type: "logical-and", value: lowerIdentifier };
    }

    if (lowerIdentifier === "like") {
      return { type: "like", value: lowerIdentifier };
    }

    return { type: "identifier", value: identifier };
  }

  #unicodeEscape(): string {
    let hexCode = "";
    for (let i = 0; i < 4; i++) {
      const char = this.#peekChar();
      if (char === null || !isHexDigit(char)) {
        throw new LexerError(
          "lexer.expected-end-of-escaped-character",
          LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
          this.#currentLocation(),
        );
      }
      hexCode += char;
      this.#nextChar();
    }

    return String.fromCharCode(parseInt(hexCode, 16));
  }

  #parameter(): TokenWithoutLocation {
    const openToken = this.#nextChar();

    let closeToken = "]";
    if (openToken === "{") closeToken = "}";

    let name = "";
    let nextCharacter = this.#peekChar();
    while (nextCharacter !== closeToken && nextCharacter !== null) {
      name += nextCharacter;
      this.#nextChar();
      nextCharacter = this.#peekChar();
    }

    if (this.#nextChar() !== closeToken)
      throw new LexerError(
        "lexer.expected-parameter-close",
        lexerErrorMessageExpectedParameterClose(closeToken),
        this.#currentLocation(),
      );

    return { type: "parameter", value: name };
  }

  #peekChar(): string | null {
    if (this.#index < this.#input.length) {
      return this.#input[this.#index];
    }
    return null;
  }

  #nextChar(): string | null {
    if (this.#index < this.#input.length) {
      const c = this.#input[this.#index];
      this.#index++;

      if (c === "\n") {
        this.#line++;
        this.#column = 1;
      } else {
        this.#column++;
      }

      return c;
    }
    return null;
  }

  #region(token: TokenWithoutLocation, tokenStart: LexerPosition): Token {
    return {
      ...token,
      location: new SourceRegion(
        this.#input,
        tokenStart.index,
        this.#index - tokenStart.index,
        tokenStart.line,
        tokenStart.column,
        this.#line,
        this.#column,
      ),
    };
  }

  #position(): LexerPosition {
    return {
      index: this.#index,
      line: this.#line,
      column: this.#column,
    };
  }

  #currentLocation(): SourceRegion {
    return new SourceRegion(
      this.#input,
      this.#index,
      0,
      this.#line,
      this.#column,
      this.#line,
      this.#column,
    );
  }

  #skipWhitespace(): void {
    for (;;) {
      const nextCharacter = this.#peekChar();
      if (nextCharacter === null || !isWhitespace(nextCharacter)) return;
      this.#nextChar();
    }
  }
}

function isNumber(s: string): boolean {
  switch (s) {
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      return true;
  }
  return false;
}

function isNumberStart(s: string): boolean {
  switch (s) {
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
    case ".":
      return true;
  }
  return false;
}

function isParameter(s: string): boolean {
  return s === "[" || s === "{";
}

function isStringStart(s: string): boolean {
  return s === "'" || s === '"';
}

function isDateStart(s: string): boolean {
  return s === "#";
}

function isGroupOpen(s: string): boolean {
  return s === "(";
}

function isGroupClose(s: string): boolean {
  return s === ")";
}

function isColon(s: string): boolean {
  return s === ":";
}

function isSeparator(s: string): boolean {
  return s === ",";
}

function isIdentifierStart(s: string): boolean {
  const lowS = s.toLowerCase();
  return lowS >= "a" && lowS <= "z";
}

function isIdentifier(s: string): boolean {
  const lowS = s.toLowerCase();
  return (lowS >= "a" && lowS <= "z") || (s >= "0" && s <= "9");
}

function isHexDigit(s: string): boolean {
  const lowS = s.toLowerCase();
  return (s >= "0" && s <= "9") || (lowS >= "a" && lowS <= "f");
}

function isOperatorStart(s: string): boolean {
  return s in operatorTrie;
}

const operatorTrie: Partial<
  Record<string, [TokenType, Partial<Record<string, TokenType>>]>
> = {
  ">": [
    "more-than",
    {
      ">": "shift-right",
      "=": "more-than-or-equal",
    },
  ],
  "<": [
    "less-than",
    {
      "<": "shift-left",
      ">": "not-equal",
      "=": "less-than-or-equal",
    },
  ],
  "=": [
    "equals",
    {
      "=": "equals",
    },
  ],
  "!": [
    "logical-not",
    {
      "=": "not-equal",
    },
  ],
  "-": ["minus", {}],
  "|": [
    "bit-or",
    {
      "|": "logical-or",
    },
  ],
  "^": ["bit-xor", {}],
  "~": ["complement", {}],
  "?": ["ternary", {}],
  "*": [
    "times",
    {
      "*": "exp",
    },
  ],
  "/": ["division", {}],
  "%": ["modulus", {}],
  "+": ["plus", {}],
  "&": ["bit-and", { "&": "logical-and" }],
};

function isWhitespace(s: string): boolean {
  return s === " " || s === "\n" || s === "\t" || s === "\r";
}
