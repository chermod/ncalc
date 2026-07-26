import { describe, expect, it } from "vitest";
import { Lexer, type Token, type TokenType } from "../classes/lexer";
import {
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE,
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
  LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING,
  lexerErrorMessageExpectedParameterClose,
  lexerErrorMessageUnrecognisedInput,
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
    expect.assertions(3);

    const [first] = tokenize("  1\n+ 2");

    expect(first.location.offset).toBe(2);
    expect(first.location.line).toBe(1);
    expect(first.location.column).toBe(3);
  });

  it("tracks lines", () => {
    expect.assertions(4);

    const [, second, third] = tokenize("  1\n+ 2");

    expect(second.location.line).toBe(2);
    expect(second.location.column).toBe(1);
    expect(third.location.line).toBe(2);
    expect(third.location.column).toBe(3);
  });
});

describe("errors", () => {
  it.each([".", "1e", "1e+", "1e-"])(
    "rejects invalid number literal %s",
    (expression) => {
      expect.assertions(1);

      expect(() => tokenize(expression)).toThrow("Invalid number literal");
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

  it("rejects incomplete string", () => {
    expect.assertions(1);

    expect(() => tokenize("'a string")).toThrow(
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING,
    );
  });

  it("rejects incomplete empty string", () => {
    expect.assertions(1);

    expect(() => tokenize("'")).toThrow(
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING,
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
      lexerErrorMessageUnrecognisedInput("\\"),
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
