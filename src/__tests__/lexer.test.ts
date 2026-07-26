import { describe, expect, it } from "vitest";
import { Lexer, type Token } from "../classes/lexer";

type TokenValue = Pick<Token, "type" | "value">;

function getTokens(s: string): Token[] {
  const tokens = [];
  let token;
  const lexer = new Lexer(s);
  while ((token = lexer.next()) !== null) {
    tokens.push(token);
  }
  return tokens;
}

function getTokenValues(s: string): TokenValue[] {
  return getTokens(s).map((token) => ({
    type: token.type,
    value: token.value,
  }));
}

describe("whitespace", () => {
  it("can function without whitespace", () => {
    expect.assertions(1);
    expect(getTokens("1.23+.123")).toMatchObject([
      { type: "number", value: "1.23" },
      { type: "plus", value: "+" },
      { type: "number", value: ".123" },
    ]);
  });
});

describe("literal", () => {
  it("reads number", () => {
    expect.assertions(1);
    expect(getTokens("1.23 .123 1e10 1E10 1.0e-20 1.e+10")).toMatchObject([
      { type: "number", value: "1.23" },
      { type: "number", value: ".123" },
      { type: "number", value: "1e10" },
      { type: "number", value: "1E10" },
      { type: "number", value: "1.0e-20" },
      { type: "number", value: "1.e+10" },
    ]);
  });

  it("reads string", () => {
    expect.assertions(1);

    expect(getTokens('"hello world"')).toMatchObject([
      { type: "string", value: "hello world" },
    ]);
  });

  it("handles escape sequences in strings", () => {
    expect.assertions(1);

    expect(
      getTokens(
        "'hello\\nworld' 'hello\\tworld' 'hello\\'world' 'hello\\\\world'",
      ),
    ).toMatchObject([
      { type: "string", value: "hello\nworld" },
      { type: "string", value: "hello\tworld" },
      { type: "string", value: "hello'world" },
      { type: "string", value: "hello\\world" },
    ]);
  });

  it("handles unicode escape sequences", () => {
    expect.assertions(1);

    expect(getTokens("'\\u0041' '\\u0042\\u0043' '\\u00E9'")).toMatchObject([
      { type: "string", value: "A" },
      { type: "string", value: "BC" },
      { type: "string", value: "é" },
    ]);
  });

  it("handles unicode escapes mixed with text", () => {
    expect.assertions(1);

    expect(getTokens("'hello\\u0020world' 'hello\\u0041world'")).toMatchObject([
      { type: "string", value: "hello world" },
      { type: "string", value: "helloAworld" },
    ]);
  });

  it("reads boolean", () => {
    expect.assertions(1);
    expect(getTokens("true false")).toMatchObject([
      { type: "boolean", value: "true" },
      { type: "boolean", value: "false" },
    ]);
  });

  it("reads date", () => {
    expect.assertions(1);
    expect(getTokens("#12/11/2020#")).toMatchObject([
      { type: "date", value: "12/11/2020" },
    ]);
  });

  it.each([".", "1e", "1e+", "1e-"])(
    "rejects invalid number literal %s",
    (expression) => {
      expect.assertions(1);
      expect(() => getTokens(expression)).toThrow("Invalid number literal");
    },
  );
});

describe("identifier", () => {
  it("reads identifier", () => {
    expect.assertions(1);
    expect(getTokens("myIdentifier")).toMatchObject([
      { type: "identifier", value: "myIdentifier" },
    ]);
  });
});

describe("operator", () => {
  it("reads operators", () => {
    expect.assertions(1);
    expect(
      getTokenValues(
        "+ - / * % ** < > <= >= in not ! != = ? <> & | && || ^ ~ and or",
      ),
    ).toMatchObject([
      { type: "plus", value: "+" },
      { type: "minus", value: "-" },
      { type: "division", value: "/" },
      { type: "times", value: "*" },
      { type: "modulus", value: "%" },
      { type: "exp", value: "**" },
      { type: "less-than", value: "<" },
      { type: "more-than", value: ">" },
      { type: "less-than-or-equal", value: "<=" },
      { type: "more-than-or-equal", value: ">=" },
      { type: "in", value: "in" },
      { type: "not", value: "not" },
      { type: "logical-not", value: "!" },
      { type: "not-equal", value: "!=" },
      { type: "equals", value: "=" },
      { type: "ternary", value: "?" },
      { type: "not-equal", value: "<>" },
      { type: "bit-and", value: "&" },
      { type: "bit-or", value: "|" },
      { type: "logical-and", value: "&&" },
      { type: "logical-or", value: "||" },
      { type: "bit-xor", value: "^" },
      { type: "complement", value: "~" },
      { type: "logical-and", value: "and" },
      { type: "logical-or", value: "or" },
    ]);
  });
});

describe("keywords", () => {
  it("reads group open / close", () => {
    expect.assertions(1);
    expect(getTokens("()")).toMatchObject([
      { type: "group-open", value: "(" },
      { type: "group-close", value: ")" },
    ]);
  });

  it("reads separator", () => {
    expect.assertions(1);
    expect(getTokens(",")).toMatchObject([{ type: "separator", value: "," }]);
  });

  it("reads parameter", () => {
    expect.assertions(1);
    expect(getTokens("[MyParam1] {MyParam}")).toMatchObject([
      { type: "parameter", value: "MyParam1" },
      { type: "parameter", value: "MyParam" },
    ]);
  });

  it("reads colon", () => {
    expect.assertions(1);
    expect(getTokens(":")).toMatchObject([{ type: "colon", value: ":" }]);
  });

  it("tracks source region offsets", () => {
    expect.assertions(3);

    const [first] = getTokens("  1\n+ 2");

    expect(first.location.offset).toBe(2);
    expect(first.location.line).toBe(1);
    expect(first.location.column).toBe(3);
  });

  it("tracks source region lines", () => {
    expect.assertions(4);

    const [, second, third] = getTokens("  1\n+ 2");

    expect(second.location.line).toBe(2);
    expect(second.location.column).toBe(1);
    expect(third.location.line).toBe(2);
    expect(third.location.column).toBe(3);
  });
});
