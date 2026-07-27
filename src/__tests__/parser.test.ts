import { describe, expect, it } from "vitest";
import { Parser, type ParserOptions } from "../classes/parser";
import { ParserError } from "../classes/parser-error";
import type {
  BinaryExpression,
  FunctionExpression,
  LogicalExpression,
  TernaryExpression,
  UnaryExpression,
  ValueExpression,
} from "../types/expression";

const withoutLocations = (expression: LogicalExpression): unknown => {
  switch (expression.type) {
    case "binary":
      return {
        type: "binary",
        operator: expression.operator,
        left: withoutLocations(expression.left),
        right: withoutLocations(expression.right),
      };
    case "function":
      return {
        type: "function",
        name: expression.name,
        arguments: expression.arguments.map(withoutLocations),
      };
    case "ternary":
      return {
        type: "ternary",
        left: withoutLocations(expression.left),
        middle: withoutLocations(expression.middle),
        right: withoutLocations(expression.right),
      };
    case "unary":
      return {
        type: "unary",
        operator: expression.operator,
        expression: withoutLocations(expression.expression),
      };
    case "value":
      switch (expression.value.type) {
        case "constant":
          return {
            type: "value",
            value: {
              type: "constant",
              value: { ...expression.value.value },
            },
          };
        case "list":
          return {
            type: "value",
            value: {
              type: "list",
              items: expression.value.items.map(withoutLocations),
            },
          };
        case "parameter":
          return {
            type: "value",
            value: { type: "parameter", name: expression.value.name },
          };
      }
  }
};

const getParserError = (action: () => unknown): ParserError => {
  try {
    action();
  } catch (error) {
    if (error instanceof ParserError) {
      return error;
    }
    throw error;
  }

  throw new Error("Expected parser to throw ParserError");
};

// const getParseSafeError = (
//   expression: string,
// ): {
//   type: "error";
//   error: ParserError;
// } => {
//   const result = parseSafe(expression);
//   if (result.type !== "error") {
//     throw new Error("Expected parseSafe to fail");
//   }

//   return result;
// };

// const getIncompleteExpression = (
//   errorResult: ReturnType<typeof getParseSafeError>,
// ): LogicalExpression => {
//   if (errorResult.error.incompleteExpression === null) {
//     throw new Error("Expected incomplete expression to exist");
//   }

//   return errorResult.error.incompleteExpression;
// };

describe("parser", () => {
  it("binary operator", () => {
    expect.assertions(1);
    expect(parse("1 + 2")).toMatchSnapshot();
  });

  it("unary operator", () => {
    expect.assertions(1);
    expect(parse("-2")).toMatchSnapshot();
  });

  it("ternary operator", () => {
    expect.assertions(1);
    expect(parse("false ? 1 : 2")).toMatchSnapshot();
  });

  it("function expression", () => {
    expect.assertions(1);
    expect(parse("MyFunctionName(1,2,false)")).toMatchSnapshot();
  });

  it("value expression", () => {
    expect.assertions(1);
    expect(parse("#11/06/2000#")).toMatchSnapshot();
  });

  it.each([
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
  ])("complex %s", (expr) => {
    expect.assertions(1);
    expect(withoutLocations(parse(expr))).toMatchSnapshot(expr);
  });

  it("adds source locations to binary and grouped expressions", () => {
    expect.assertions(4);

    const binary = parse("1 + 2") as BinaryExpression;

    expect(binary.location).toMatchObject({ offset: 0, extent: 5 });
    expect(binary.left.location).toMatchObject({ offset: 0, extent: 1 });
    expect(binary.right.location).toMatchObject({ offset: 4, extent: 1 });

    const grouped = parse("(1 + 2)") as BinaryExpression;

    expect(grouped.location).toMatchObject({ offset: 0, extent: 7 });
  });

  it("adds source locations to unary and ternary expressions", () => {
    expect.assertions(3);

    const unary = parse("-2") as UnaryExpression;

    expect(unary.location).toMatchObject({ offset: 0, extent: 2 });
    expect(unary.expression.location).toMatchObject({ offset: 1, extent: 1 });

    const ternary = parse("false ? 1 : 2") as TernaryExpression;

    expect(ternary.location).toMatchObject({ offset: 0, extent: 13 });
  });

  it("adds source locations to function calls and list expressions", () => {
    expect.assertions(4);

    const functionExpression = parse("Fun(1)") as FunctionExpression;

    expect(functionExpression.location).toMatchObject({ offset: 0, extent: 6 });
    expect(functionExpression.arguments[0]?.location).toMatchObject({
      offset: 4,
      extent: 1,
    });

    const list = parse("(1,2)") as ValueExpression;

    expect(list.location).toMatchObject({ offset: 0, extent: 5 });
    expect(
      (list.value as { type: "list"; items: LogicalExpression[] }).items[1]
        ?.location,
    ).toMatchObject({
      offset: 3,
      extent: 1,
    });
  });

  it("errors", () => {
    expect.assertions(2);

    const parserInvalidExpression = () => parse("(123 *)  10/");

    expect(parserInvalidExpression).toThrow(ParserError);
    expect(parserInvalidExpression).toThrowErrorMatchingSnapshot();
  });

  it("stops on first parse issue by default", () => {
    expect.assertions(1);

    const parserError = getParserError(() => parse("(123 *)  10/"));

    expect(parserError.errors).toHaveLength(1);
  });

  it("collects multiple issues when stopOnFirstError is false", () => {
    expect.assertions(1);

    const parserError = getParserError(() =>
      parse("(123 *)  10/", { stopOnFirstError: false }),
    );

    expect(parserError.errors.length).toBeGreaterThan(1);
  });

  // it("returns incomplete ast in parseSafe error case", () => {
  // expect.assertions(2);

  // const result = getParseSafeError("1 2");
  // const incompleteExpression = getIncompleteExpression(result);

  // expect(result.error.incompleteExpression).not.toBeNull();
  // expect(withoutLocations(incompleteExpression)).toStrictEqual({
  //   type: "value",
  //   value: {
  //     type: "constant",
  //     value: { type: "number", value: "1" },
  //   },
  // });
  // });
});

const parse = (s: string, o?: ParserOptions): LogicalExpression => {
  return new Parser(s, o).parse()
} 