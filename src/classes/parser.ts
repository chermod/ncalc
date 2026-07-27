

import type {
  BinaryExpression,
  LogicalExpression,
  TernaryExpression,
  UnaryExpression,
  ValueExpression,
} from "../types/expression";
import { SourceRegion } from "./source-region";
import { Lexer, type Token, type TokenType } from "./lexer";
import { LexerError } from "./lexer-error";
import { PARSER_ERROR_MESSAGE_EXPECTED_COLON, PARSER_ERROR_MESSAGE_EXPECTED_GROUP_CLOSE, PARSER_ERROR_MESSAGE_EXPECTED_IN_AFTER_NOT, PARSER_ERROR_MESSAGE_FAILED_TO_PARSE_EXPRESSION, PARSER_ERROR_MESSAGE_UNEXPECTED_TOKENS_AFTER_EXPRESSION, parserErrorMessageUnknownTokenType } from "./parser-messages";
import { type ParseIssue, ParserError, RecoverableParserError } from "./parser-error";

export type ParserOptions = {
  stopOnFirstError?: boolean;
};

export class Parser {
  readonly #lexer: Lexer;
  readonly #errors: ParseIssue[] = [];
  readonly #stopOnFirstError: boolean;

  constructor(input: string, options?: ParserOptions) {
    this.#lexer = new Lexer(input);
    this.#stopOnFirstError = options?.stopOnFirstError ?? true;
  }

  parse(): LogicalExpression {
    let incompleteExpression: LogicalExpression | null = null;

    while (this.#lexer.peek() !== null) {
      try {
        const expressionResult = expression(this.#lexer, Precedence.None);
        incompleteExpression = expressionResult;

        if (this.#lexer.peek() === null) {
          return expressionResult;
        }

        throw new ParserError(
          PARSER_ERROR_MESSAGE_UNEXPECTED_TOKENS_AFTER_EXPRESSION,
          this.#errors,
          incompleteExpression,
        );
      } catch (e) {
        if (e instanceof RecoverableParserError || e instanceof LexerError) {
          if (this.#stopOnFirstError) {
            throw new ParserError(
              PARSER_ERROR_MESSAGE_FAILED_TO_PARSE_EXPRESSION,
              [e],
              incompleteExpression,
            );
          }

          this.#errors.push(e);

          if (!this.#synchronize()) {
            break;
          }

          continue;
        }
        throw e;
      }
    }

    throw new ParserError(
      PARSER_ERROR_MESSAGE_FAILED_TO_PARSE_EXPRESSION,
      this.#errors,
      incompleteExpression,
    );
  }

  #synchronize(): boolean {
    while (this.#lexer.peek() !== null) {
      const token = this.#lexer.peek();
      if (!token) return false;

      this.#lexer.next();
      if (isSyncToken(token.type)) {
        return true;
      }
    }
    return false;
  }
}

const isSyncToken = (type: TokenType): boolean => {
  switch (type) {
    case "separator":
    case "group-close":
    case "logical-or":
    case "logical-and":
      return true;
  }
  return false;
};

const Precedence = {
  None: 0,
  Ternary: 10,
  Or: 20,
  And: 30,
  Comparison: 40,
  BitOr: 50,
  BitXor: 60,
  BitAnd: 70,
  BitShift: 80,
  Additive: 90,
  Factor: 100,
  Unary: 110,
  Exponentiation: 120,
  Value: 130,
} as const satisfies Record<string, number>;

type InfixHandler = (
  lexer: Lexer,
  left: LogicalExpression,
  token: Token,
) => LogicalExpression;

type PrefixHandler = (lexer: Lexer, token: Token) => LogicalExpression;

type ParseRule = {
  infix: InfixHandler | null;
  prefix: PrefixHandler | null;
  precedence: number;
};

const nullRule: ParseRule = {
  infix: null,
  prefix: null,
  precedence: Precedence.None,
};

const createConstant = (
  type: "string" | "date" | "number" | "boolean",
): ParseRule => {
  return {
    infix: null,
    prefix: (_parser, token) =>
      ({
        type: "value",
        value: { type: "constant", value: { type, value: token.value } },
        location: token.location,
      }) satisfies ValueExpression,
    precedence: Precedence.Value,
  };
};

const createParameter = (): ParseRule => {
  return {
    infix: null,
    prefix: (_parser, token) =>
      ({
        type: "value",
        value: { type: "parameter", name: token.value },
        location: token.location,
      }) satisfies ValueExpression,
    precedence: Precedence.Value,
  };
};

const createIdentifier = (): ParseRule => ({
  infix: null,
  prefix: (lexer, token) => {
    const openToken = match(lexer, "group-open");
    if (openToken === null) {
      return {
        type: "value",
        value: { type: "parameter", name: token.value },
        location: token.location,
      } satisfies ValueExpression;
    }

    const args: LogicalExpression[] = [];
    let closeToken = match(lexer, "group-close");

    if (closeToken === null) {
      for (; ;) {
        args.push(expression(lexer, Precedence.None));

        if (lexer.peek()?.type !== "separator") break;
        lexer.next();
      }

      closeToken = match(lexer, "group-close");
      if (closeToken === null) {
        throw new RecoverableParserError(
          "parser.expected-group-close",
          PARSER_ERROR_MESSAGE_EXPECTED_GROUP_CLOSE,
          lexer.peek(),
        );
      }
    }

    return {
      type: "function",
      name: token.value,
      arguments: args,
      location: SourceRegion.encloseAll(
        token.location,
        openToken.location,
        ...args.map((arg) => arg.location),
        closeToken.location,
      ),
    };
  },
  precedence: Precedence.Value,
});

const createGroupOpen = (): ParseRule => ({
  infix: null,
  prefix: (lexer, openToken) => {
    const emptyListCloseToken = match(lexer, "group-close");
    if (emptyListCloseToken !== null) {
      return {
        type: "value",
        value: { type: "list", items: [] },
        location: SourceRegion.encloseAll(
          openToken.location,
          emptyListCloseToken.location,
        ),
      } satisfies ValueExpression;
    }

    const firstExpression = expression(lexer, Precedence.None);
    const separatorToken = match(lexer, "separator");

    if (separatorToken === null) {
      const closeToken = match(lexer, "group-close");
      if (closeToken === null) {
        throw new RecoverableParserError(
          "parser.expected-group-close",
          PARSER_ERROR_MESSAGE_EXPECTED_GROUP_CLOSE,
          lexer.peek(),
        );
      }

      return {
        ...firstExpression,
        location: SourceRegion.encloseAll(
          openToken.location,
          firstExpression.location,
          closeToken.location,
        ),
      };
    }

    const items: LogicalExpression[] = [firstExpression];
    let closeToken = match(lexer, "group-close");

    if (closeToken === null) {
      for (; ;) {
        items.push(expression(lexer, Precedence.None));

        if (!match(lexer, "separator")) break;
      }

      closeToken = match(lexer, "group-close");
      if (closeToken === null) {
        throw new RecoverableParserError(
          "parser.expected-group-close",
          PARSER_ERROR_MESSAGE_EXPECTED_GROUP_CLOSE,
          lexer.peek(),
        );
      }
    }

    return {
      type: "value",
      value: { type: "list", items },
      location: SourceRegion.encloseAll(
        openToken.location,
        separatorToken.location,
        ...items.map((item) => item.location),
        closeToken.location,
      ),
    } satisfies ValueExpression;
  },
  precedence: Precedence.Value,
});

const createUnary =
  (
    operator: UnaryExpression["operator"],
    precedence: number,
    associates: "left" | "right" = "left",
  ): PrefixHandler =>
    (lexer, token) => {
      const expr = expression(
        lexer,
        associates == "right" ? precedence - 1 : precedence,
      );
      return {
        type: "unary",
        expression: expr,
        location: SourceRegion.encloseAll(token.location, expr.location),
        operator,
      } satisfies UnaryExpression;
    };

const createBinary =
  (
    operator: BinaryExpression["operator"],
    precedence: number,
    associates: "left" | "right" = "left",
  ): InfixHandler =>
    (lexer, left, token) => {
      const right = expression(
        lexer,
        associates == "right" ? precedence - 1 : precedence,
      );
      return {
        type: "binary",
        left,
        right,
        location: SourceRegion.encloseAll(left.location, token.location, right.location),
        operator,
      } satisfies BinaryExpression;
    };

const createNot = (): ParseRule => ({
  infix: (lexer, left, notToken) => {
    const inToken = match(lexer, "in");
    if (inToken !== null) {
      const right = expression(lexer, Precedence.Comparison);
      return {
        type: "binary",
        operator: "not-in",
        left,
        right,
        location: SourceRegion.encloseAll(
          left.location,
          notToken.location,
          inToken.location,
          right.location,
        ),
      } satisfies BinaryExpression;
    }

    const likeToken = match(lexer, "in");
    if (likeToken !== null) {
      const right = expression(lexer, Precedence.Comparison);
      return {
        type: "binary",
        operator: "not-like",
        left,
        right,
        location: SourceRegion.encloseAll(
          left.location,
          notToken.location,
          likeToken.location,
          right.location,
        ),
      } satisfies BinaryExpression;
    }

    throw new RecoverableParserError(
      "parser.expected-in-after-not",
      PARSER_ERROR_MESSAGE_EXPECTED_IN_AFTER_NOT,
      lexer.peek(),
    );
  },
  prefix: createUnary("not", Precedence.Unary),
  precedence: Precedence.Comparison,
});

const match = (lexer: Lexer, type: TokenType): Token | null => {
  if (lexer.peek()?.type !== type) return null;
  return lexer.next();
};

const createTernary = (): ParseRule => ({
  infix: (lexer, left, ternaryToken) => {
    const middle = expression(lexer, Precedence.Ternary - 1);
    const colonToken = match(lexer, "colon");

    if (colonToken === null) {
      throw new RecoverableParserError(
        "parser.expected-colon",
        PARSER_ERROR_MESSAGE_EXPECTED_COLON,
        lexer.peek(),
      );
    }

    const right = expression(lexer, Precedence.Ternary - 1);

    return {
      type: "ternary",
      left,
      middle,
      right,
      location: SourceRegion.encloseAll(
        left.location,
        ternaryToken.location,
        middle.location,
        colonToken.location,
        right.location,
      ),
    } satisfies TernaryExpression;
  },
  prefix: null,
  precedence: Precedence.Ternary,
});

const rules: Record<TokenType, ParseRule> = {
  string: createConstant("string"),
  number: createConstant("number"),
  boolean: createConstant("boolean"),
  "group-open": createGroupOpen(),
  "group-close": nullRule,
  separator: nullRule,
  colon: nullRule,
  parameter: createParameter(),
  date: createConstant("date"),
  identifier: createIdentifier(),
  "logical-and": {
    prefix: null,
    infix: createBinary("and", Precedence.And),
    precedence: Precedence.And,
  },
  "more-than": {
    prefix: null,
    infix: createBinary("greater-than", Precedence.Comparison),
    precedence: Precedence.Comparison,
  },
  "less-than": {
    prefix: null,
    infix: createBinary("less-than", Precedence.Comparison),
    precedence: Precedence.Comparison,
  },
  "less-than-or-equal": {
    prefix: null,
    infix: createBinary("less-than-equal", Precedence.Comparison),
    precedence: Precedence.Comparison,
  },
  "more-than-or-equal": {
    prefix: null,
    infix: createBinary("greater-than-equal", Precedence.Comparison),
    precedence: Precedence.Comparison,
  },
  "not-equal": {
    prefix: null,
    infix: createBinary("not-equals", Precedence.Comparison),
    precedence: Precedence.Comparison,
  },
  "logical-not": {
    prefix: createUnary("not", Precedence.Unary),
    infix: null,
    precedence: Precedence.Unary,
  },
  equals: {
    prefix: null,
    infix: createBinary("equals", Precedence.Comparison),
    precedence: Precedence.Comparison,
  },
  minus: {
    prefix: createUnary("negate", Precedence.Unary),
    infix: createBinary("subtraction", Precedence.Additive),
    precedence: Precedence.Additive,
  },
  "bit-or": {
    prefix: null,
    infix: createBinary("bit-or", Precedence.BitOr),
    precedence: Precedence.BitOr,
  },
  exp: {
    prefix: null,
    infix: createBinary("exponentiation", Precedence.Exponentiation, "right"),
    precedence: Precedence.Exponentiation,
  },
  "bit-xor": {
    prefix: null,
    infix: createBinary("bit-xor", Precedence.BitXor),
    precedence: Precedence.BitXor,
  },
  "bit-and": {
    prefix: null,
    infix: createBinary("bit-and", Precedence.BitAnd),
    precedence: Precedence.BitAnd,
  },
  "shift-right": {
    prefix: null,
    infix: createBinary("bit-right-shift", Precedence.BitShift),
    precedence: Precedence.BitShift,
  },
  "shift-left": {
    prefix: null,
    infix: createBinary("bit-left-shift", Precedence.BitShift),
    precedence: Precedence.BitShift,
  },
  plus: {
    prefix: null,
    infix: createBinary("addition", Precedence.Additive),
    precedence: Precedence.Additive,
  },
  times: {
    prefix: null,
    infix: createBinary("multiplication", Precedence.Factor),
    precedence: Precedence.Factor,
  },
  ternary: createTernary(),
  "logical-or": {
    prefix: null,
    infix: createBinary("or", Precedence.Or),
    precedence: Precedence.Or,
  },
  division: {
    prefix: null,
    infix: createBinary("division", Precedence.Factor),
    precedence: Precedence.Factor,
  },
  modulus: {
    prefix: null,
    infix: createBinary("modulus", Precedence.Factor),
    precedence: Precedence.Factor,
  },
  complement: {
    prefix: createUnary("bit-complement", Precedence.Unary),
    infix: null,
    precedence: Precedence.Unary,
  },
  in: {
    prefix: null,
    infix: createBinary("in", Precedence.Comparison),
    precedence: Precedence.Comparison,
  },
  not: createNot(),
  like: {
    prefix: null,
    infix: createBinary("like", Precedence.Comparison),
    precedence: Precedence.Comparison,
  },
};

const expression = (lexer: Lexer, precedence: number): LogicalExpression => {
  const token = lexer.peek();
  if (token === null)
    throw new RecoverableParserError(
      "parser.expected-value",
      PARSER_ERROR_MESSAGE_FAILED_TO_PARSE_EXPRESSION,
      token,
    );

  const prefixRule = rules[token.type].prefix;
  if (prefixRule === null) {
    throw new RecoverableParserError(
      "parser.unknown-token-type",
      parserErrorMessageUnknownTokenType(token.type),
      token,
    );
  }

  lexer.next();
  let left = prefixRule(lexer, token);

  while (precedence < nextPrecedence(lexer)) {
    const lookahead = lexer.peek();
    if (lookahead === null) {
      throw new RecoverableParserError(
        "parser.expected-value",
        PARSER_ERROR_MESSAGE_FAILED_TO_PARSE_EXPRESSION,
        lookahead,
      );
    }

    const infixRule = rules[lookahead.type].infix;
    if (infixRule === null) {
      throw new RecoverableParserError(
        "parser.unknown-token-type",
        parserErrorMessageUnknownTokenType(lookahead.type),
        lookahead,
      );
    }

    lexer.next();

    left = infixRule(lexer, left, lookahead);
  }

  return left;
};

const nextPrecedence = (lexer: Lexer): number => {
  const lookahead = lexer.peek();
  if (lookahead === null || rules[lookahead.type].infix === null) return -1;

  return rules[lookahead.type].precedence;
};

