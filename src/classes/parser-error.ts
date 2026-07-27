import type { LogicalExpression } from "../types/expression";
import type { Token } from "./lexer";
import type { LexerErrorCode } from "./lexer-error";
import { NCalcError } from "./ncalc-error";
import type { SourceRegion } from "./source-region";

export class ParserError extends NCalcError {
    public readonly errors: readonly ParseIssue[];
    public readonly incompleteExpression: LogicalExpression | null;

    constructor(
        message: string,
        errors: readonly ParseIssue[],
        incompleteExpression: LogicalExpression | null = null
    ) {
        super(message);
        Object.setPrototypeOf(this, ParserError.prototype);
        this.errors = errors;
        this.incompleteExpression = incompleteExpression;
    }
}

export class RecoverableParserError extends NCalcError implements ParseIssue {
    public readonly code: RecoverableParserErrorCode;
    public readonly token: Token | null;

    constructor(
        code: RecoverableParserErrorCode,
        message: string,
        token: Token | null = null
    ) {
        super(message);
        Object.setPrototypeOf(this, RecoverableParserError.prototype);
        this.code = code;
        this.token = token;
    }

    get where(): SourceRegion | null {
        return this.token?.location ?? null;
    }

    get detailedMessage(): string {
        if (this.token === null) {
            return this.message;
        }

        return `${this.message} got ${this.token.type} '${this.token.value}' at line ${this.token.location.line.toString()}, column ${this.token.location.column.toString()}`;
    }
}

export interface ParseIssue {
    readonly code: ParseIssueCode;
    readonly message: string;
    readonly where: SourceRegion | null;
    readonly detailedMessage: string;
}

export type RecoverableParserErrorCode = "parser.expected-colon" |
    "parser.expected-in-after-not" |
    "parser.expected-group-close" |
    "parser.expected-value" |
    "parser.unknown-token-type";

export type ParseIssueCode = LexerErrorCode | RecoverableParserErrorCode;
