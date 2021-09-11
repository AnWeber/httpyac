import { HttpSymbolKind, getHttpLineGenerator, HttpRegionParserResult, ParserContext } from '../models';
import { VariableAction } from '../actions';
import { ParserRegex } from './parserRegex';


export async function parseVariable(getLineReader: getHttpLineGenerator, { httpRegion }: ParserContext): Promise<HttpRegionParserResult> {
  const lineReader = getLineReader();

  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;

    const match = ParserRegex.variable.exec(textLine);

    if (match && match.groups && match.groups.key && match.groups.value) {
      httpRegion.hooks.execute.addObjHook(obj => obj.process, new VariableAction({
        [match.groups.key]: match.groups.value.trim(),
      }));
      return {
        nextParserLine: next.value.line,
        symbols: [{
          name: match.groups.key,
          description: match.groups.value,
          kind: HttpSymbolKind.variable,
          startLine: next.value.line,
          startOffset: 0,
          endLine: next.value.line,
          endOffset: next.value.textLine.length,
          children: [{
            name: match.groups.key,
            description: 'key',
            kind: HttpSymbolKind.key,
            startLine: next.value.line,
            startOffset: next.value.textLine.indexOf(match.groups.key),
            endLine: next.value.line,
            endOffset: next.value.textLine.indexOf(match.groups.key) + match.groups.key.length,
          }, {
            name: match.groups.value,
            description: 'value',
            kind: HttpSymbolKind.value,
            startLine: next.value.line,
            startOffset: next.value.textLine.indexOf(match.groups.value),
            endLine: next.value.line,
            endOffset: next.value.textLine.indexOf(match.groups.value) + match.groups.value.length,
          }]
        }],
      };
    }
  }
  return false;
}
