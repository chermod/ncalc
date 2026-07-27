import { describe, expect, it } from "vitest";
import { Parser, type ParserOptions } from "../classes/parser";
import { ParserError } from "../classes/parser-error";
import type { LogicalExpression } from "../types/expression";
import { getError } from "./utils";

describe("valid expressions", () => {
  it.each([
    "1+2",
    "-2",
    "false?1:2",
    "MyFunctionName(1,2,false)",
    "#11/06/2000#",
    "[1] < #11/06/2000#",
    "1 < 2",
    "1 > 2",
    "1 <= 2",
    "1 >= 2",
    "1 = 2",
    "1 != 2",
    "1 <> 2",
    "true && false",
    "true and false",
    "true || false",
    "true or false",
    "1  in (1,)",
    "1 not in (1,)",
    "1 + 2",
    "1 - 2",
    "1 * 2",
    "1 / 2",
    "1 % 2",
    "1 ** 2",
    "MyFunction(1,2)",
    "1 * MyParam * {MyParam} * [MyParam] * (1,2)",
    "()",
    "(1,)",
    "(1,2)",
    "!false",
    "!!false",
    "---1",
    "-1",
    "~1",
    "~~~~1",
    "1 | 2",
    "1 & 2",
    "1 ^ 2",
    "1 << 2",
    "1 >> 2",
    "Fun()",
    "x like y",
    "x not in y",
  ])("parses %s", (s) => {
    expect.assertions(1);
    expect(new Parser(s).parse()).toMatchSnapshot();
  });
});

describe("progressive error messages", () => {
  it("throws parser errors", () => {
    expect.assertions(2);

    const parserInvalidExpression = () => parse("(123 *)  10/");

    expect(parserInvalidExpression).toThrow(ParserError);
    expect(parserInvalidExpression).toThrowErrorMatchingSnapshot();
  });

  it("stops on first parse issue by default", () => {
    expect.assertions(1);

    const parserError = getError(() => parse("(123 *)  10/"));

    expect.assert(parserError instanceof ParserError);
    expect(parserError.errors).toHaveLength(1);
  });

  it("collects multiple issues when stopOnFirstError is false", () => {
    expect.assertions(1);

    const parserError = getError(() =>
      parse("(123 *)  10/", { stopOnFirstError: false }),
    );

    expect.assert(parserError instanceof ParserError);
    expect(parserError.errors.length).toBeGreaterThan(1);
  });
});

describe("source tracking", () => {
  it("adds source locations to binary and grouped expressions", () => {
    expect.assertions(4);

    const binary = parse("1 + 2");

    expect.assert(binary.type === "binary");

    expect(binary.location).toMatchObject({ offset: 0, extent: 5 });
    expect(binary.left.location).toMatchObject({ offset: 0, extent: 1 });
    expect(binary.right.location).toMatchObject({ offset: 4, extent: 1 });

    const grouped = parse("(1 + 2)");

    expect(grouped.location).toMatchObject({ offset: 0, extent: 7 });
  });

  it("adds source locations to unary and ternary expressions", () => {
    expect.assertions(3);

    const unary = parse("-2");

    expect.assert(unary.type === "unary");

    expect(unary.location).toMatchObject({ offset: 0, extent: 2 });
    expect(unary.expression.location).toMatchObject({ offset: 1, extent: 1 });

    const ternary = parse("false ? 1 : 2");

    expect(ternary.location).toMatchObject({ offset: 0, extent: 13 });
  });

  it("adds source locations to function calls and list expressions", () => {
    expect.assertions(4);

    const functionExpression = parse("Fun(1)");

    expect.assert(functionExpression.type === "function");

    expect(functionExpression.location).toMatchObject({ offset: 0, extent: 6 });
    expect(functionExpression.arguments[0]?.location).toMatchObject({
      offset: 4,
      extent: 1,
    });

    const list = parse("(1,2)");

    expect.assert(list.type === "value");
    expect(list.location).toMatchObject({ offset: 0, extent: 5 });

    expect.assert(list.value.type === "list");
    expect(list.value.items[1]?.location).toMatchObject({
      offset: 3,
      extent: 1,
    });
  });
});

const parse = (s: string, o?: ParserOptions): LogicalExpression => {
  return new Parser(s, o).parse();
};
