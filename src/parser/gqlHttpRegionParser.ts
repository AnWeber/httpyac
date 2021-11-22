import { GqlAction, GqlData } from '../actions';
import { fileProvider } from '../io';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';

export async function parseGraphql(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();

  if (context.httpRegion.metaData.noGqlParsing) {
    return false;
  }

  const gqlContent = await getGQLContent(lineReader);
  if (gqlContent) {
    const gqlData: GqlData = {
      fragments: getGqlFragments(context),
    };

    if (context.httpRegion.request) {
      gqlData.query = gqlContent.gql;
      if (gqlContent.name) {
        gqlData.operationName = gqlContent.name;
        if (!context.httpRegion.metaData.name) {
          context.httpRegion.metaData.name = gqlContent.name;
        }
      }
      context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new GqlAction(gqlData));
    } else if (gqlContent.name) {
      gqlData.fragments[gqlContent.name] = gqlContent.gql;
    }
    return {
      nextParserLine: gqlContent.endLine,
      symbols: [
        {
          name: 'gql',
          description: 'gql',
          kind: models.HttpSymbolKind.gql,
          startLine: gqlContent.startLine,
          startOffset: 0,
          endLine: gqlContent.endLine,
          endOffset: gqlContent.endOffset,
        },
      ],
    };
  }
  return false;
}

function getGqlFragments(context: models.ParserContext) {
  let result = context.data.gql;
  if (!result) {
    result = {};
    context.data.gql = result;
  }
  return result;
}

async function getGQLContent(lineReader: models.HttpLineGenerator): Promise<GqlParserResult | false> {
  const next = lineReader.next();
  if (!next.done) {
    const startLine = next.value.line;

    const fileMatches = ParserRegex.gql.fileImport.exec(next.value.textLine);
    if (fileMatches && fileMatches.groups?.fileName) {
      const parserPath = fileMatches.groups.fileName;
      return {
        startLine,
        endLine: startLine,
        endOffset: next.value.textLine.length,
        name: fileMatches.groups.name || fileMatches.groups.fileName,
        gql: (context: models.ProcessorContext) =>
          utils.replaceFilePath(parserPath, context, (path: models.PathLike) => fileProvider.readFile(path, 'utf-8')),
      };
    }
    const queryMatch = ParserRegex.gql.query.exec(next.value.textLine);
    if (queryMatch) {
      return matchGqlContent(next.value, lineReader, queryMatch.groups?.name);
    }
    const fragmentMatch = ParserRegex.gql.fragment.exec(next.value.textLine);
    if (fragmentMatch) {
      return matchGqlContent(next.value, lineReader, fragmentMatch.groups?.name);
    }
  }
  return false;
}

function matchGqlContent(
  value: { textLine: string; line: number },
  lineReader: models.HttpLineGenerator,
  name: string | undefined
): GqlParserResult {
  let next = lineReader.next();
  let prevReader = {
    endLine: value.line,
    endOffset: value.textLine.length,
  };
  const gqlLines: Array<string> = [value.textLine];
  while (!next.done) {
    prevReader = {
      endLine: next.value.line,
      endOffset: next.value.textLine.length,
    };
    if (ParserRegex.emptyLine.test(next.value.textLine)) {
      return {
        name,
        startLine: value.line,
        ...prevReader,
        gql: utils.toMultiLineString(gqlLines),
      };
    }
    gqlLines.push(next.value.textLine);

    next = lineReader.next();
  }
  return {
    name,
    startLine: value.line,
    ...prevReader,
    gql: utils.toMultiLineString(gqlLines),
  };
}

export interface GqlParserResult {
  name?: string;
  startLine: number;
  endLine: number;
  endOffset: number;
  gql: string | ((context: models.ProcessorContext) => Promise<string | undefined>);
}
