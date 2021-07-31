import { HttpSymbol, HttpSymbolKind, getHttpLineGenerator, HttpRegionParserResult, ParserContext, HttpRegion } from '../models';
import * as actions from '../actions';
import { ParserRegex } from './parserRegex';


export async function parseMetaData(getLineReader: getHttpLineGenerator, context: ParserContext): Promise<HttpRegionParserResult> {
  const lineReader = getLineReader();
  const { httpRegion, data } = context;
  if (data.metaTitle) {
    httpRegion.metaData.title = data.metaTitle.trim();
    delete data.metaTitle;
  }
  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;
    if (ParserRegex.meta.all.test(textLine)) {

      const result: HttpRegionParserResult = {
        nextParserLine: next.value.line
      };
      const delimiterMatch = ParserRegex.meta.delimiter.exec(textLine);
      if (delimiterMatch) {
        result.endRegionLine = next.value.line - 1;
        data.metaTitle = delimiterMatch.groups?.title;
      } else {
        const match = ParserRegex.meta.data.exec(textLine);

        if (match && match.groups && match.groups.key) {
          const symbol: HttpSymbol = {
            name: match.groups.key,
            description: match.groups.value || '-',
            kind: HttpSymbolKind.metaData,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
            children: [{
              name: match.groups.key,
              description: 'key of meta data',
              kind: HttpSymbolKind.metaDataKey,
              startLine: next.value.line,
              startOffset: next.value.textLine.indexOf(match.groups.key),
              endLine: next.value.line,
              endOffset: next.value.textLine.indexOf(match.groups.key) + match.groups.key.length,
            }]
          };
          if (match.groups.value && symbol.children) {
            symbol.children.push({
              name: match.groups.value,
              description: 'value of meta data',
              kind: HttpSymbolKind.metaDataValue,
              startLine: next.value.line,
              startOffset: next.value.textLine.indexOf(match.groups.value),
              endLine: next.value.line,
              endOffset: next.value.textLine.indexOf(match.groups.value) + match.groups.value.length,
            });
          }
          result.symbols = [symbol];

          const key = match.groups.key.replace(/-./gu, value => value[1].toUpperCase());

          switch (key) {
            case 'import':
              if (match.groups.value) {
                httpRegion.hooks.execute.addObjHook(obj => obj.process, new actions.ImportMetaAction(
                  match.groups.value, context.httpFileStore
                ));

              }
              break;
            case 'responseRef':
              if (match.groups.value) {
                if (!httpRegion.responseRefs) {
                  httpRegion.responseRefs = [];
                }
                httpRegion.responseRefs.push(match.groups.value);
              }
              break;
            case 'loop':
              if (match.groups.value) {
                const forOfMatch = ParserRegex.meta.forOf.exec(match.groups.value);
                if (forOfMatch?.groups?.iterable && forOfMatch?.groups?.variable) {
                  httpRegion.hooks.execute.addInterceptor(new actions.LoopMetaAction({
                    type: actions.LoopMetaType.forOf,
                    variable: forOfMatch.groups.variable,
                    iterable: forOfMatch.groups.iterable,
                  }));
                } else {
                  const forMatch = ParserRegex.meta.for.exec(match.groups.value);
                  if (forMatch?.groups?.counter) {
                    httpRegion.hooks.execute.addInterceptor(new actions.LoopMetaAction({
                      type: actions.LoopMetaType.for,
                      counter: Number.parseInt(forMatch.groups.counter, 10),
                    }));
                  } else {
                    const whileMatch = ParserRegex.meta.while.exec(match.groups.value);
                    if (whileMatch?.groups?.expression) {
                      httpRegion.hooks.execute.addInterceptor(new actions.LoopMetaAction({
                        type: actions.LoopMetaType.while,
                        expression: whileMatch.groups.expression,
                      }));
                    }
                  }
                }
              }
              break;
            case 'ref':
              if (match.groups.value) {
                addRefHttpRegion(httpRegion, match.groups.value, false);
              }
              break;
            case 'forceRef':
              if (match.groups.value) {
                addRefHttpRegion(httpRegion, match.groups.value, true);
              }
              break;
            default:
              httpRegion.metaData = Object.assign(httpRegion.metaData || {}, {
                [key]: match.groups.value || true,
              });
              break;
          }
        }
      }
      return result;
    }
  }
  return false;
}

function addRefHttpRegion(httpRegion: HttpRegion, name: string, force: boolean) {
  httpRegion.hooks.execute.addObjHook(obj => obj.process, new actions.RefMetaAction({
    name,
    force
  }));
}
