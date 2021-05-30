import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, ActionType } from '../models';
import { toMultiLineString, toAbsoluteFilename, pushAfter } from '../utils';
import { log } from '../logger';
import { GqlAction, GqlData } from '../actions';
import { ParserRegex } from './parserRegex';
import { fileProvider, PathLike } from '../fileProvider';

export class GqlHttpRegionParser implements HttpRegionParser {
  async parse(lineReader: HttpRegionParserGenerator, context: ParserContext): Promise<HttpRegionParserResult> {

    if (context.httpRegion.metaData.noGqlParsing) {
      return false;
    }

    const gqlContent = await getGQLContent(lineReader, context.httpFile.fileName);
    if (gqlContent) {
      const gqlData: GqlData = {
        fragments: this.getGqlFragments(context),
      };

      if (context.httpRegion.request) {
        gqlData.query = gqlContent.gql;
        if (gqlContent.name) {
          gqlData.operationName = gqlContent.name;
          if (!context.httpRegion.metaData.name) {
            context.httpRegion.metaData.name = gqlContent.name;
          }
        }
        pushAfter(context.httpRegion.actions, obj => obj.type === ActionType.request, new GqlAction(gqlData));
      } else if (gqlContent.name) {
        gqlData.fragments[gqlContent.name] = gqlContent.gql;
      }
      return {
        nextParserLine: gqlContent.endLine,
        symbols: [{
          name: 'gql',
          description: 'gql',
          kind: HttpSymbolKind.gql,
          startLine: gqlContent.startLine,
          startOffset: 0,
          endLine: gqlContent.endLine,
          endOffset: gqlContent.endOffset,
        }]
      };
    }
    return false;
  }

  private getGqlFragments(context: ParserContext) {
    let result = context.data.gql;
    if (!result) {
      result = {};
      context.data.gql = result;
    }
    return result;
  }
}


async function getGQLContent(lineReader: HttpRegionParserGenerator, httpFileName: PathLike): Promise<GqlParserResult | false> {
  const next = lineReader.next();
  if (!next.done) {

    const startLine = next.value.line;

    const fileMatches = ParserRegex.gql.fileImport.exec(next.value.textLine);
    if (fileMatches && fileMatches.groups?.fileName) {
      try {
        const normalizedPath = await toAbsoluteFilename(fileMatches.groups.fileName, httpFileName);
        if (normalizedPath) {
          return {
            startLine,
            endLine: startLine,
            endOffset: next.value.textLine.length,
            name: fileMatches.groups.name || fileMatches.groups.fileName,
            gql: () => fileProvider.readFile(normalizedPath, 'utf-8')
          };
        }
      } catch (err) {
        log.trace(err);
      }
    } else {
      const queryMatch = ParserRegex.gql.query.exec(next.value.textLine);
      if (queryMatch) {
        return matchGqlContent(next.value, lineReader, queryMatch.groups?.name);
      }
      const fragmentMatch = ParserRegex.gql.fragment.exec(next.value.textLine);
      if (fragmentMatch) {
        return matchGqlContent(next.value, lineReader, fragmentMatch.groups?.name);
      }
    }
  }
  return false;
}


function matchGqlContent(value: { textLine: string; line: number }, lineReader: HttpRegionParserGenerator, name: string | undefined): GqlParserResult | false {
  const startLine = value.line;
  let next = lineReader.next();
  const gqlLines: Array<string> = [value.textLine];
  while (!next.done) {
    if (ParserRegex.emptyLine.test(next.value.textLine)) {
      return {
        name,
        startLine,
        endLine: next.value.line,
        endOffset: next.value.textLine.length,
        gql: toMultiLineString(gqlLines),
      };
    }
    gqlLines.push(next.value.textLine);
    next = lineReader.next();
  }
  return false;
}

export interface GqlParserResult{
  name?: string,
  startLine: number,
  endLine: number,
  endOffset: number;
  gql: string | (() => Promise<string>);
}
