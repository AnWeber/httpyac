import { HttpFile, HttpSymbol, HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, HttpRegion } from '../models';
import { log } from '../logger';
import { toAbsoluteFilename } from '../utils';
import { RefMetaAction } from '../actions';
import { HttpFileStore } from '../httpFileStore';
import { ParserRegex } from './parserRegex';
import { fileProvider } from '../fileProvider';
export class MetaHttpRegionParser implements HttpRegionParser {

  async parse(lineReader: HttpRegionParserGenerator, { httpRegion, httpFile, httpFileStore }: ParserContext): Promise<HttpRegionParserResult> {
    const next = lineReader.next();
    if (!next.done) {
      const textLine = next.value.textLine;
      if (ParserRegex.meta.all.test(textLine)) {

        const result: HttpRegionParserResult = {
          nextParserLine: next.value.line
        };
        if (ParserRegex.meta.delimiter.test(textLine)) {
          result.endRegionLine = next.value.line - 1;
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
                  await this.importHttpFile(httpFile, match.groups.value, httpFileStore);
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
              case 'ref':
                if (match.groups.value) {
                  this.addRefHttpRegion(httpRegion, match.groups.value, false);
                }
                break;
              case 'forceRef':
                if (match.groups.value) {
                  this.addRefHttpRegion(httpRegion, match.groups.value, true);
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

  async importHttpFile(httpFile: HttpFile, fileName: string, httpFileStore: HttpFileStore): Promise<void> {
    try {
      if (!httpFile.imports) {
        httpFile.imports = [];
      }
      httpFile.imports.push(async (httpFile: HttpFile) => {
        const absoluteFileName = await toAbsoluteFilename(fileName, httpFile.fileName);
        if (absoluteFileName) {
          return await httpFileStore.getOrCreate(absoluteFileName, () => fileProvider.readFile(absoluteFileName, 'utf-8'), 0);
        }
        return false;
      });

    } catch (err) {
      log.error('import error', fileName);
    }
  }

  private addRefHttpRegion(httpRegion: HttpRegion, name: string, force: boolean) {
    httpRegion.actions.push(new RefMetaAction({
      name,
      force
    }));
  }
}
