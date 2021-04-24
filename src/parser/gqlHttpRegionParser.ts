import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, ActionType } from '../models';
import { toMultiLineString, toAbsoluteFilename, pushAfter } from '../utils';
import { promises as fs } from 'fs';
import { log } from '../logger';
import { GqlAction, GqlData } from '../actions';

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
      for (const [key, value] of Object.entries(gqlData.fragments)) {
        const gql = gqlContent.gql;
        if (gql.indexOf(`...${key}`) >= 0) {
          gqlContent.gql = toMultiLineString([gqlContent.gql, value]);
        }
      }

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
        endLine: gqlContent.endLine,
        symbols: [{
          name: 'gql',
          description: 'gql',
          kind: HttpSymbolKind.gql,
          startLine: gqlContent.startLine,
          startOffset: 0,
          endLine: gqlContent.endLine,
          endOffset: 0,
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


async function getGQLContent(lineReader: HttpRegionParserGenerator, httpFileName: string): Promise<GqlParserResult | false> {
  const next = lineReader.next();
  if (!next.done) {

    const startLine = next.value.line;

    const fileMatches = /^\s*gql(\s+(?<name>[^\s(]+))?\s+<\s+(?<fileName>.+)\s*$/u.exec(next.value.textLine);
    if (fileMatches && fileMatches.groups?.fileName) {
      try {
        const normalizedPath = await toAbsoluteFilename(fileMatches.groups.fileName, httpFileName);
        if (normalizedPath) {
          return {
            startLine,
            endLine: startLine,
            name: fileMatches.groups.name || fileMatches.groups.fileName,
            gql: await fs.readFile(normalizedPath, 'utf-8')
          };
        }
      } catch (err) {
        log.trace(err);
      }
    } else {
      const queryMatch = /^\s*(query|mutation)(\s+(?<name>[^\s(]+))?/u.exec(next.value.textLine);
      if (queryMatch) {
        return matchGqlContent(next.value, lineReader, queryMatch.groups?.name);
      }
      const fragmentMatch = /^\s*(fragment)\s+(?<name>[^\s(]+)\s+on\s+/u.exec(next.value.textLine);
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
    if (/^\s*$/u.test(next.value.textLine)) {
      return {
        name,
        startLine,
        endLine: next.value.line,
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
  gql: string;
}
