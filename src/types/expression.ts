import type { SourceRegion } from "../classes/source-region";

export type LogicalExpression =
  | TernaryExpression
  | BinaryExpression
  | UnaryExpression
  | ValueExpression
  | FunctionExpression;

export type TernaryExpression = {
  type: "ternary";
  left: LogicalExpression;
  right: LogicalExpression;
  middle: LogicalExpression;
  location: SourceRegion | null;
};

export type BinaryExpression = {
  type: "binary";
  operator:
  | "subtraction"
  | "addition"
  | "multiplication"
  | "division"
  | "modulus"
  | "exponentiation"
  | "greater-than"
  | "less-than"
  | "greater-than-equal"
  | "less-than-equal"
  | "not-equals"
  | "equals"
  | "and"
  | "or"
  | "bit-and"
  | "bit-or"
  | "bit-xor"
  | "bit-left-shift"
  | "bit-right-shift"
  | "in"
  | "not-in"
  | "like"
  | "not-like";
  left: LogicalExpression;
  right: LogicalExpression;
  location: SourceRegion | null;
};

export type UnaryExpression = {
  type: "unary";
  operator: "not" | "bit-complement" | "negate";
  expression: LogicalExpression;
  location: SourceRegion | null;
};

export type ValueExpression = {
  type: "value";
  value:
  | {
    type: "constant";
    value: {
      type: "string" | "date" | "number" | "boolean";
      value: string;
    };
  }
  | { type: "parameter"; name: string }
  | { type: "list"; items: LogicalExpression[] };
  location: SourceRegion | null;
};

export type FunctionExpression = {
  type: "function";
  name: string;
  arguments: LogicalExpression[];
  location: SourceRegion | null;
};
