import type {
  BinaryExpression,
  FunctionExpression,
  LogicalExpression,
  TernaryExpression,
  UnaryExpression,
  ValueExpression,
} from "./expression";

export interface Visitor<T> {
  logical(expression: LogicalExpression): T;
  ternary(expression: TernaryExpression): T;
  binary(expression: BinaryExpression): T;
  unary(expression: UnaryExpression): T;
  value(expression: ValueExpression): T;
  function(expression: FunctionExpression): T;
}
