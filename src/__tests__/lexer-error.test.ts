import { describe, expect, it } from "vitest";
import { LexerError } from "../classes/lexer-error";
import { LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER } from "../classes/lexer-messages";
import { SourceRegion } from "../classes/source-region";

describe("detailed message", () => {
  it("is formatted", () => {
    expect.assertions(1);

    const region = new SourceRegion({
      source: "source",
      offset: 1,
      extent: 2,
      line: 3,
      column: 4,
      endLine: 5,
      endColumn: 6,
    });

    const error = new LexerError(
      "lexer.expected-end-of-escaped-character",
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
      region,
    );

    expect(error.detailedMessage).toBe(
      "Expected end of escaped character at line 3, column 4",
    );
  });
});

describe("where", () => {
  it("is passed through", () => {
    expect.assertions(1);

    const region = new SourceRegion({
      source: "source",
      offset: 1,
      extent: 2,
      line: 3,
      column: 4,
      endLine: 5,
      endColumn: 6,
    });

    const error = new LexerError(
      "lexer.expected-end-of-escaped-character",
      LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER,
      region,
    );

    expect(error.where).toStrictEqual(region);
  });
});
