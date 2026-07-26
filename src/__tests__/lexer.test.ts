import { describe, expect, it } from "vitest";
import { Lexer, type Token, type TokenType } from "../classes/lexer";
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
      expect.assertions(1);

      expect(() => tokenize(expression)).toThrow(
        expect.objectContaining({
          code: "lexer.invalid-number",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          location: expect.objectContaining({
            source: expression,
            offset: expression.length,
            extent: 0,
            line: 1,
            column: expression.length + 1,
            endLine: 1,
            endColumn: expression.length + 1,
          }),
        }),
      );
    },
  );

  it("rejects incomplete square brackets parameter", () => {
    expect.assertions(1);

    expect(() => tokenize("[Incomplete Parameter")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-parameter-close",
        message: lexerErrorMessageExpectedParameterClose("]"),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "[Incomplete Parameter",
          offset: 21,
          extent: 0,
          line: 1,
          column: 22,
          endLine: 1,
          endColumn: 22,
        }),
      }),
    );
  });

  it("rejects incomplete braces parameter", () => {
    expect.assertions(1);

    expect(() => tokenize("{Incomplete Parameter")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-parameter-close",
        message: lexerErrorMessageExpectedParameterClose("}"),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "{Incomplete Parameter",
          offset: 21,
          extent: 0,
          line: 1,
          column: 22,
          endLine: 1,
          endColumn: 22,
        }),
      }),
    );
  });

  it("rejects incomplete unicode literals", () => {
    expect.assertions(1);

    expect(() => tokenize("'\\u123'")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-end-of-escaped-character",
        message: LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "'\\u123'",
          offset: 6,
          extent: 0,
          line: 1,
          column: 7,
          endLine: 1,
          endColumn: 7,
        }),
      }),
    );
  });

  it("rejects invalid unicode literals", () => {
    expect.assertions(1);

    expect(() => tokenize("'\\uZZZZ'")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-end-of-escaped-character",
        message: LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "'\\uZZZZ'",
          offset: 3,
          extent: 0,
          line: 1,
          column: 4,
          endLine: 1,
          endColumn: 4,
        }),
      }),
    );
  });

  it("rejects incomplete string", () => {
    expect.assertions(1);

    expect(() => tokenize("'a\nstring")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-end-of-string",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "'a\nstring",
          offset: 9,
          extent: 0,
          line: 2,
          column: 7,
          endLine: 2,
          endColumn: 7,
        }),
      }),
    );
  });

  it("rejects incomplete empty string", () => {
    expect.assertions(1);

    expect(() => tokenize("'")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-end-of-string",
        message: LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "'",
          offset: 1,
          extent: 0,
          line: 1,
          column: 2,
          endLine: 1,
          endColumn: 2,
        }),
      }),
    );
  });

  it("does not error early if next token is invalid", () => {
    expect.assertions(4);

    const lexer = new Lexer("1 \\");

    const token = { type: "number", value: "1" };

    expect(lexer.peek()).toMatchObject(token);
    expect(lexer.next()).toMatchObject(token);
    expect(() => lexer.peek()).toThrow(
      expect.objectContaining({
        code: "lexer.unrecognized-input",
        message: lexerErrorMessageUnrecognizedInput("\\"),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "1 \\",
          offset: 2,
          extent: 1,
          line: 1,
          column: 3,
          endLine: 1,
          endColumn: 4,
        }),
      }),
    );
    expect(() => lexer.next()).toThrow(
      expect.objectContaining({
        code: "lexer.unrecognized-input",
        message: lexerErrorMessageUnrecognizedInput("\\"),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "1 \\",
          offset: 2,
          extent: 1,
          line: 1,
          column: 3,
          endLine: 1,
          endColumn: 4,
        }),
      }),
    );
  });

  it("rejects incomplete string escape", () => {
    expect.assertions(1);

    expect(() => tokenize("'a string\\Z")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-end-of-escaped-character",
        message: LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "'a string\\Z",
          offset: 10,
          extent: 0,
          line: 1,
          column: 11,
          endLine: 1,
          endColumn: 11,
        }),
      }),
    );
  });

  it("rejects incomplete string escape at end of string", () => {
    expect.assertions(1);

    expect(() => tokenize("'a string\\")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-end-of-escaped-character",
        message: LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "'a string\\",
          offset: 10,
          extent: 0,
          line: 1,
          column: 11,
          endLine: 1,
          endColumn: 11,
        }),
      }),
    );
  });

  it("rejects incomplete date", () => {
    expect.assertions(1);

    expect(() => tokenize("#a date")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-end-of-date",
        message: LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "#a date",
          offset: 7,
          extent: 0,
          line: 1,
          column: 8,
          endLine: 1,
          endColumn: 8,
        }),
      }),
    );
  });

  it("rejects incomplete empty date", () => {
    expect.assertions(1);

    expect(() => tokenize("#")).toThrow(
      expect.objectContaining({
        code: "lexer.expected-end-of-date",
        message: LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "#",
          offset: 1,
          extent: 0,
          line: 1,
          column: 2,
          endLine: 1,
          endColumn: 2,
        }),
      }),
    );
  });

  it("rejects unrecognized input", () => {
    expect.assertions(1);

    expect(() => tokenize("\\")).toThrow(
      expect.objectContaining({
        code: "lexer.unrecognized-input",
        message: lexerErrorMessageUnrecognizedInput("\\"),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        location: expect.objectContaining({
          source: "\\",
          offset: 0,
          extent: 1,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 2,
        }),
      }),
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
