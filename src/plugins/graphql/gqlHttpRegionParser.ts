import { fileProvider } from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { GqlAction, GqlData } from './gqlAction';

const EmptyLine = /^\s*$/u;

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
        gqlData.operationName = removeDirectives(gqlContent.name);
        if (!context.httpRegion.metaData.name) {
          context.httpRegion.metaData.name = gqlContent.name;
        }
      }
      context.httpRegion.hooks.onRequest.addObjHook(obj => obj.process, new GqlAction(gqlData));
    } else if (gqlContent.name) {
      gqlData.fragments[gqlContent.name] = gqlContent.gql;
    }
    return {
      nextParserLine: gqlContent.symbol.endLine,
      symbols: [gqlContent.symbol],
    };
  }
  return false;
}

function removeDirectives(operationName: string) {
  if (operationName) {
    return operationName
      .trim()
      .split(' ')
      .filter(name => !!name && !name.startsWith('@'))
      .pop();
  }
  return operationName;
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

    const fileMatches = /^\s*gql(\s+(?<name>[^\s(]+))?\s+<\s+(?<fileName>.+)\s*$/u.exec(next.value.textLine);
    if (fileMatches && fileMatches.groups?.fileName) {
      const parserPath = fileMatches.groups.fileName.trim();
      return {
        symbol: new models.HttpSymbol({
          name: 'gql',
          description: 'gql',
          kind: models.HttpSymbolKind.gql,
          startLine,
          startOffset: 0,
          endLine: startLine,
          endOffset: next.value.textLine.length,
          children: [
            new models.HttpSymbol({
              name: 'filename',
              description: parserPath,
              kind: models.HttpSymbolKind.path,
              startLine: next.value.line,
              startOffset: next.value.textLine.indexOf(parserPath),
              endLine: next.value.line,
              endOffset: next.value.textLine.indexOf(parserPath) + parserPath.length,
            }),
          ],
        }),
        name: fileMatches.groups.name || fileMatches.groups.fileName,
        gql: (context: models.ProcessorContext) =>
          utils.replaceFilePath(parserPath, context, (path: models.PathLike) => fileProvider.readFile(path, 'utf-8')),
      };
    }
    const queryMatch = /^\s*(query|mutation)(\s+(?<name>[^\s(]+))?/u.exec(next.value.textLine);
    if (queryMatch) {
      return matchGqlContent(next.value, lineReader, queryMatch.groups?.name);
    }
    const fragmentMatch = /^\s*(fragment)\s+(?<name>[^\s(]+)\s+on\s+/u.exec(next.value.textLine);
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
    if (EmptyLine.test(next.value.textLine)) {
      return {
        name,
        symbol: new models.HttpSymbol({
          name: 'gql',
          description: 'gql',
          kind: models.HttpSymbolKind.gql,
          startLine: value.line,
          startOffset: 0,
          ...prevReader,
        }),
        gql: utils.toMultiLineString(gqlLines),
      };
    }
    gqlLines.push(next.value.textLine);

    next = lineReader.next();
  }
  return {
    name,
    symbol: new models.HttpSymbol({
      name: 'gql',
      description: 'gql',
      kind: models.HttpSymbolKind.gql,
      startLine: value.line,
      startOffset: 0,
      ...prevReader,
    }),
    gql: utils.toMultiLineString(gqlLines),
  };
}

export interface GqlParserResult {
  name?: string;
  symbol: models.HttpSymbol;
  gql: string | ((context: models.ProcessorContext) => Promise<string | undefined>);
}
