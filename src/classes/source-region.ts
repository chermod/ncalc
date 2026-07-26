import { NCalcError } from "./ncalc-error";

export type SourceRegionOptions = {
  source: string;
  offset: number;
  extent: number;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
};

export class SourceRegion {
  public readonly source: string;
  public readonly offset: number;
  public readonly extent: number;
  public readonly line: number;
  public readonly column: number;
  public readonly endLine: number;
  public readonly endColumn: number;

  constructor({
    source,
    offset,
    extent,
    line,
    column,
    endLine,
    endColumn,
  }: SourceRegionOptions) {
    this.source = source;
    this.offset = offset;
    this.extent = extent;
    this.line = line;
    this.column = column;
    this.endLine = endLine;
    this.endColumn = endColumn;
  }

  enclose(other: SourceRegion): SourceRegion {
    if (this.source !== other.source) {
      throw new NCalcError(SOURCE_REGION_ERROR_MESSAGE_DIFFERENT_SOURCES);
    }

    const enclosedOffset = Math.min(this.offset, other.offset);
    const enclosedEndOffset = Math.max(this.#endOffset, other.#endOffset);

    const startsWithThis = this.offset <= other.offset;
    const endsWithThis = this.#endOffset >= other.#endOffset;

    const enclosedLine = startsWithThis ? this.line : other.line;
    const enclosedColumn = startsWithThis ? this.column : other.column;
    const enclosedEndLine = endsWithThis ? this.endLine : other.endLine;
    const enclosedEndColumn = endsWithThis ? this.endColumn : other.endColumn;

    return new SourceRegion({
      source: this.source,
      offset: enclosedOffset,
      extent: enclosedEndOffset - enclosedOffset,
      line: enclosedLine,
      column: enclosedColumn,
      endLine: enclosedEndLine,
      endColumn: enclosedEndColumn,
    });
  }

  get #endOffset(): number {
    return this.offset + this.extent;
  }
}

const SOURCE_REGION_ERROR_MESSAGE_DIFFERENT_SOURCES =
  "Cannot enclose regions from different sources";
