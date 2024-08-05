import {
  getHttpLineGenerator,
  HttpRegionParserResult,
  HttpSymbol,
  HttpSymbolKind,
  ParserContext,
} from '../../../models';

export async function parseResponseRef(
  getLineReader: getHttpLineGenerator,
  { httpRegion }: ParserContext
): Promise<HttpRegionParserResult> {
  const lineReader = getLineReader();

  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;

    const match = /^\s*<>\s*(?<fileName>.+?)\s*$/u.exec(textLine);
    if (match && match.groups?.fileName) {
      if (!httpRegion.responseRefs) {
        httpRegion.responseRefs = [];
      }

      const filename = match.groups.fileName;
      httpRegion.responseRefs.push(filename);
      return {
        nextParserLine: next.value.line,
        symbols: [
          new HttpSymbol({
            name: 'responseRef',
            description: match.groups.filename,
            kind: HttpSymbolKind.response,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
            children: [
              new HttpSymbol({
                name: 'filename',
                description: filename,
                kind: HttpSymbolKind.path,
                startLine: next.value.line,
                startOffset: textLine.indexOf(filename),
                endLine: next.value.line,
                endOffset: textLine.indexOf(filename) + filename.length,
              }),
            ],
          }),
        ],
      };
    }
  }
  return false;
}
