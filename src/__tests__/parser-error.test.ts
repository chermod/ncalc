import { describe, expect, it } from "vitest";
import {
    ParserError,
    RecoverableParserError,
    type ParseIssue,
} from "../classes/parser-error";
import { SourceRegion, type SourceRegionOptions } from "../classes/source-region";
import type { LogicalExpression } from "../types/expression";

describe("parser error", () => {
    it("stores parser state and formats message", () => {
        expect.assertions(3);

        const incompleteExpression: LogicalExpression = { type: "value", location: null, value: { type: 'constant', value: { type: 'boolean', value: 'false' } } };

        const issue: ParseIssue = {
            code: "parser.expected-colon",
            message: "Expected colon",
            where: new SourceRegion({
                source: "(1",
                offset: 0,
                extent: 0,
                line: 0,
                column: 0,
                endLine: 0,
                endColumn: 0
            } satisfies SourceRegionOptions),
            detailedMessage: "Expected colon at source"
        }

        const error = new ParserError(
            "Failed to parse expression",
            [issue],
            incompleteExpression,
        );

        expect(error.message).toBe("Failed to parse expression");
        expect(error.errors).toStrictEqual([issue]);
        expect(error.incompleteExpression).toBe(incompleteExpression);
    });
});

describe("recoverable parser error", () => {
    it("formats the detailed message without a token", () => {
        expect.assertions(3);

        const error = new RecoverableParserError(
            "parser.expected-value",
            "Expected value",
        );

        expect(error.code).toBe("parser.expected-value");
        expect(error.where).toBeNull();
        expect(error.detailedMessage).toBe("Expected value");
    });

    it("formats the detailed message with token information", () => {
        expect.assertions(3);

        const location = new SourceRegion({
            source: "source",
            offset: 1,
            extent: 1,
            line: 2,
            column: 3,
            endLine: 2,
            endColumn: 4,
        });

        const error = new RecoverableParserError(
            "parser.expected-value",
            "Expected value",
            {
                type: "number",
                value: "1",
                location,
            },
        );

        expect(error.where).toStrictEqual(location);
        expect(error.detailedMessage).toBe(
            "Expected value got number '1' at line 2, column 3",
        );
        expect(error.token).toStrictEqual({
            type: "number",
            value: "1",
            location,
        });
    });
});