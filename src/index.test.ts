import { expect, test } from "vitest";
import { example } from ".";

test("example", () => {
  expect(example('hello')).toBe("Hello 10");
});
