import { describe, expect, it } from "vitest";
import { example } from ".";

describe("index", () => {
  it("example", () => {
    expect.assertions(1);
    expect(example(10)).toBe("Hello 10");
  });
});
