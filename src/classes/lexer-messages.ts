export const LEXER_ERROR_MESSAGE_EXPECTED_END_OF_DATE = "Expected end of date";

export const LEXER_ERROR_MESSAGE_EXPECTED_START_OF_STRING =
  "Expected start of string";

export const LEXER_ERROR_MESSAGE_EXPECTED_END_OF_STRING =
  "Expected end of string";

export const LEXER_ERROR_MESSAGE_EXPECTED_END_OF_ESCAPED_CHARACTER =
  "Expected end of escaped character";

export const LEXER_ERROR_MESSAGE_UNRECOGNISED_OPERATOR =
  "Unrecognised input parsing operator";

export const lexerErrorMessageUnrecognisedInput = (input: string): string =>
  `Unrecognised input '${input}'`;

export const lexerErrorMessageInvalidNumber = (input: string): string =>
  `Invalid number literal '${input}'`;

export const lexerErrorMessageExpectedParameterClose = (
  closeToken: string,
): string => `Expected ${closeToken}`;
