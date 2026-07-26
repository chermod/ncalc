import { describe, expect, it } from "vitest";
import { Lexer, type Token, type TokenType } from "../classes/lexer";
import { LexerError } from "../classes/lexer-error";
import {
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE,
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING,
  lexerErrorMessageExpectedParameterClose,
  lexerErrorMessageUnrecognizedInput,
} from "../classes/lexer-messages";

describe("token types", () => {
  it.each<[string, TokenType, string?]>([
    ["0.23", "number"],
    ["1.23", "number"],
    [".123", "number"],
    ["1e10", "number"],
    ["1E10", "number"],
    ["1.0e-20", "number"],
    ["1.e+10", "number"],
    ["'hello world'", "string", "hello world"],
    ['"hello world"', "string", "hello world"],
    ["'hello\\nworld'", "string", "hello\nworld"],
    ["'hello\\rworld'", "string", "hello\rworld"],
    ["'hello\\tworld'", "string", "hello\tworld"],
    ["'hello\\'world'", "string", "hello'world"],
    ["'hello\\\\world'", "string", "hello\\world"],
    ["'\\u0041'", "string", "A"],
    ["'\\u0042\\u0043'", "string", "BC"],
    ["'\\u00E9'", "string", "é"],
    ["'hello\\u0020world'", "string", "hello world"],
    ["'hello\\u0041world'", "string", "helloAworld"],
    ["true", "boolean"],
    ["false", "boolean"],
    ["#12/11/2020#", "date", "12/11/2020"],
    ["#any string#", "date", "any string"],
    ["myIdentifier1", "identifier"],
    ["+", "plus"],
    ["-", "minus"],
    ["/", "division"],
    ["*", "times"],
    ["%", "modulus"],
    ["**", "exp"],
    ["<", "less-than"],
    [">", "more-than"],
    ["<=", "less-than-or-equal"],
    [">=", "more-than-or-equal"],
    ["in", "in"],
    ["not", "not"],
    ["!", "logical-not"],
    ["!=", "not-equal"],
    ["=", "equals"],
    ["?", "ternary"],
    ["<>", "not-equal"],
    ["&", "bit-and"],
    ["|", "bit-or"],
    ["&&", "logical-and"],
    ["||", "logical-or"],
    ["^", "bit-xor"],
    ["~", "complement"],
    [">>", "shift-right"],
    ["<<", "shift-left"],
    ["==", "equals"],
    ["and", "logical-and"],
    ["or", "logical-or"],
    ["(", "group-open"],
    [")", "group-close"],
    [",", "separator"],
    ["[MyParam1]", "parameter", "MyParam1"],
    ["{MyParam}", "parameter", "MyParam"],
    [":", "colon"],
    ["like", "like"],
  ])("reads %s as token type %s", (s, type, clean) => {
    expect.assertions(1);

    expect(tokenize(s)).toMatchObject([{ type, value: clean ?? s }]);
  });
});

describe("whitespace", () => {
  it("can function with whitespace", () => {
    expect.assertions(1);

    expect(
      tokenize("1.23                 +                      .123"),
    ).toMatchObject([
      { type: "number", value: "1.23" },
      { type: "plus", value: "+" },
      { type: "number", value: ".123" },
    ]);
  });

  it("can function without whitespace", () => {
    expect.assertions(1);

    expect(tokenize("1.23+.123")).toMatchObject([
      { type: "number", value: "1.23" },
      { type: "plus", value: "+" },
      { type: "number", value: ".123" },
    ]);
  });
});

describe("source tracking", () => {
  it("tracks offsets", () => {
    expect.assertions(1);

    const [first] = tokenize("  1\n+ 2");

    expect(first.location).toMatchObject({
      offset: 2,
      line: 1,
      column: 3,
      extent: 1,
      endLine: 1,
      endColumn: 4,
    });
  });

  it("tracks lines", () => {
    expect.assertions(2);

    const [, second, third] = tokenize("  1\n+ 2");

    expect(second.location).toMatchObject({
      line: 2,
      column: 1,
      extent: 1,
      endLine: 2,
      endColumn: 2,
    });
    expect(third.location).toMatchObject({
      line: 2,
      column: 3,
      extent: 1,
      endLine: 2,
      endColumn: 4,
    });
  });
});

describe("errors", () => {
  it.each([".", "1e", "1e+", "1e-"])(
    "rejects invalid number literal %s",
    (expression) => {
      expect.assertions(2);

      let error;

      try {
        tokenize(expression);

        expect.fail("Expected tokenize to throw");
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(LexerError);
      expect(error).toMatchObject({
        code: "lexer.invalid-number",
        location: {
          source: expression,
          offset: expression.length,
          extent: 0,
          line: 1,
          column: expression.length + 1,
          endLine: 1,
          endColumn: expression.length + 1,
        },
      });
    },
  );

  it("rejects incomplete square brackets parameter", () => {
    expect.assertions(1);

    expect(() => tokenize("[Incomplete Parameter")).toThrow(
      lexerErrorMessageExpectedParameterClose("]"),
    );
  });

  it("rejects incomplete braces parameter", () => {
    expect.assertions(1);

    expect(() => tokenize("{Incomplete Parameter")).toThrow(
      lexerErrorMessageExpectedParameterClose("}"),
    );
  });

  it("rejects incomplete unicode literals", () => {
    expect.assertions(1);

    expect(() => tokenize("'\\u123'")).toThrow(
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
    );
  });

  it("rejects invalid unicode literals", () => {
    expect.assertions(1);

    expect(() => tokenize("'\\uZZZZ'")).toThrow(
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
    );
  });

  it("rejects incomplete string", () => {
    expect.assertions(2);

    let error;
    try {
      tokenize("'a\nstring");

      expect.fail("Expected tokenize to throw");
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(LexerError);

    expect(error).toMatchObject({
      code: "lexer.expected-end-of-string",
      location: {
        source: "'a\nstring",
        offset: 9,
        extent: 0,
        line: 2,
        column: 7,
        endLine: 2,
        endColumn: 7,
      },
    });
  });

  it("rejects incomplete empty string", () => {
    expect.assertions(1);

    expect(() => tokenize("'")).toThrow(
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING,
    );
  });

  it("does not error early if next token is invalid", () => {
    expect.assertions(4);

    const lexer = new Lexer("1 \\");

    const token = { type: "number", value: "1" };

    expect(lexer.peek()).toMatchObject(token);
    expect(lexer.next()).toMatchObject(token);
    expect(() => lexer.peek()).toThrow(
      lexerErrorMessageUnrecognizedInput("\\"),
    );
    expect(() => lexer.next()).toThrow(
      lexerErrorMessageUnrecognizedInput("\\"),
    );
  });

  it("rejects incomplete string escape", () => {
    expect.assertions(1);

    expect(() => tokenize("'a string\\Z")).toThrow(
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
    );
  });

  it("rejects incomplete date", () => {
    expect.assertions(1);

    expect(() => tokenize("#a date")).toThrow(
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE,
    );
  });

  it("rejects incomplete empty date", () => {
    expect.assertions(1);

    expect(() => tokenize("#")).toThrow(
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE,
    );
  });

  it("rejects unrecognized input", () => {
    expect.assertions(1);

    expect(() => tokenize("\\")).toThrow(
      lexerErrorMessageUnrecognizedInput("\\"),
    );
  });
});

function tokenize(s: string): Token[] {
  const tokens = [];
  let token;
  const lexer = new Lexer(s);
  let tokenCount = 0;
  while ((token = lexer.next()) !== null) {
    tokens.push(token);
    tokenCount++;
    if (tokenCount > 1000) {
      expect.fail("Encountered too many tokens");
    }
  }
  return tokens;
}
