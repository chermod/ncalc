import { expect, test } from "vitest";
import { example } from ".";

test("example", () => {
  expect(example(10)).toBe("Hello 10");
});
