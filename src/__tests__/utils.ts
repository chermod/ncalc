import type { LogicalExpression } from "../types/expression";

/* v8 ignore start */

export const stripLocations = (
  expression: LogicalExpression,
): LogicalExpression => {
  switch (expression.type) {
    case "binary":
      return {
        type: "binary",
        operator: expression.operator,
        left: stripLocations(expression.left),
        right: stripLocations(expression.right),
        location: null,
      };
    case "function":
      return {
        type: "function",
        name: expression.name,
        arguments: expression.arguments.map(stripLocations),
        location: null,
      };
    case "ternary":
      return {
        type: "ternary",
        left: stripLocations(expression.left),
        middle: stripLocations(expression.middle),
        right: stripLocations(expression.right),
        location: null,
      };
    case "unary":
      return {
        type: "unary",
        operator: expression.operator,
        expression: stripLocations(expression.expression),
        location: null,
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
            location: null,
          };
        case "list":
          return {
            type: "value",
            value: {
              type: "list",
              items: expression.value.items.map(stripLocations),
            },
            location: null,
          };
        case "parameter":
          return {
            type: "value",
            value: { type: "parameter", name: expression.value.name },
            location: null,
          };
      }
  }
};
export const getError = (action: () => unknown): unknown => {
  try {
    action();
  } catch (error) {
    return error;
  }
};

/* v8 ignore stop */
