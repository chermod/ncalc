import { describe, expect, it } from "vitest";
import { SourceRegion } from "../classes/source-region";

describe("enclose", () => {
  it("fully encloses regions when this region starts first", () => {
    expect.assertions(1);

    const first = new SourceRegion({
      source: "a + b",
      offset: 0,
      extent: 1,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 2,
    });

    const second = new SourceRegion({
      source: "a + b",
      offset: 4,
      extent: 1,
      line: 1,
      column: 5,
      endLine: 1,
      endColumn: 6,
    });

    expect(first.enclose(second)).toMatchObject({
      source: "a + b",
      offset: 0,
      extent: 5,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 6,
    });
  });

  it("fully encloses regions when other region starts first", () => {
    expect.assertions(1);

    const first = new SourceRegion({
      source: "a + b",
      offset: 4,
      extent: 1,
      line: 2,
      column: 1,
      endLine: 2,
      endColumn: 2,
    });

    const second = new SourceRegion({
      source: "a + b",
      offset: 0,
      extent: 1,
      line: 1,
      column: 3,
      endLine: 1,
      endColumn: 4,
    });

    expect(first.enclose(second)).toMatchObject({
      source: "a + b",
      offset: 0,
      extent: 5,
      line: 1,
      column: 3,
      endLine: 2,
      endColumn: 2,
    });
  });

  it("returns the outer region when one region is fully contained", () => {
    expect.assertions(1);

    const outer = new SourceRegion({
      source: "abcdef",
      offset: 1,
      extent: 4,
      line: 1,
      column: 2,
      endLine: 1,
      endColumn: 6,
    });

    const inner = new SourceRegion({
      source: "abcdef",
      offset: 2,
      extent: 1,
      line: 1,
      column: 3,
      endLine: 1,
      endColumn: 4,
    });

    expect(outer.enclose(inner)).toMatchObject({
      source: "abcdef",
      offset: 1,
      extent: 4,
      line: 1,
      column: 2,
      endLine: 1,
      endColumn: 6,
    });
  });

  it("throws when regions are from different sources", () => {
    expect.assertions(1);

    const first = new SourceRegion({
      source: "a",
      offset: 0,
      extent: 1,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 2,
    });
    const second = new SourceRegion({
      source: "b",
      offset: 0,
      extent: 1,
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 2,
    });

    expect(() => first.enclose(second)).toThrow(
      "Cannot enclose regions from different sources",
    );
  });
});
