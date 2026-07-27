import type { LogicalExpression } from "./expression";

export type CalculatorArgument = {
  expression: LogicalExpression;
  evaluate: () => unknown;
};

export interface Calculator {
  ternary: (
    left: CalculatorArgument,
    middle: CalculatorArgument,
    right: CalculatorArgument,
  ) => unknown;
  add: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  in: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  notIn: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  sub: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  div: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  mul: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  greaterThan: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  lessThan: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  greaterThanOrEqual: (
    left: CalculatorArgument,
    right: CalculatorArgument,
  ) => unknown;
  lessThanEqual: (
    left: CalculatorArgument,
    right: CalculatorArgument,
  ) => unknown;
  notEquals: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  equals: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  and: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  or: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  bitAnd: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  bitOr: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  bitXor: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  bitLeftShift: (
    left: CalculatorArgument,
    right: CalculatorArgument,
  ) => unknown;
  bitRightShift: (
    left: CalculatorArgument,
    right: CalculatorArgument,
  ) => unknown;
  modulus: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  exponentiation: (
    left: CalculatorArgument,
    right: CalculatorArgument,
  ) => unknown;
  not: (left: CalculatorArgument) => unknown;
  bitComplement: (left: CalculatorArgument) => unknown;
  negate: (left: CalculatorArgument) => unknown;
  like: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
  notLike: (left: CalculatorArgument, right: CalculatorArgument) => unknown;
}
