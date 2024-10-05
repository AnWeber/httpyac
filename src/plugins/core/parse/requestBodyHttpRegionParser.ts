import * as models from '../../../models';
import * as utils from '../../../utils';
import { fileProvider, log } from '../../../io';
import { transformToBufferOrString } from '../request';

export async function parseRequestBody(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();

  if (context.httpRegion.request) {
    const requestBody = getRequestBody(context);
    const next = lineReader.next();

    if (!next.done) {
      const textLine = next.value.textLine;

      const match =
        /^<(?:(?<injectVariables>@)(?<encoding>\w+)?)?\s+(?<fileName>.+?)\s+>>(?<force>!)?\s+(?<outputFile>.+?)\s*$/u.exec(
          textLine
        );

      if (requestBody.rawBody.length > 0 || !utils.isStringEmpty(textLine)) {
        const symbols: Array<models.HttpSymbol> = [];

        if (!requestBody.symbol || requestBody.symbol.endLine !== next.value.line - 1) {
          requestBody.symbol = new models.HttpSymbol({
            name: 'request body',
            description: 'request body',
            kind: models.HttpSymbolKind.requestBody,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
            children: utils.parseHandlebarsSymbols(textLine, next.value.line),
          });
          symbols.push(requestBody.symbol);
        } else {
          requestBody.symbol.endLine = next.value.line;
          requestBody.symbol.endOffset = next.value.textLine.length;
          requestBody.symbol.children?.push?.(...utils.parseHandlebarsSymbols(next.value.textLine, next.value.line));
        }

        if (match && match.groups?.outputFile) {
          console.log(match.groups.outputFile.trim());
          const fileName = match.groups.outputFile.trim();
          const force: boolean = !!match.groups.force;

          context.httpRegion.hooks.onRequest.addHook('inputRedirection', async (request, context) => {
            try {
              console.log(`request body is ${request.body}`);
              if (request.body) {
                console.log('Request body is present');
                const body = await transformToBufferOrString(request.body, context);
                const fileNameReplaced = utils.toString(
                  await utils.replaceVariables(fileName, models.VariableType.variable, context)
                );
                console.log(`File name replaced is ${fileNameReplaced}`);

                if (fileNameReplaced) {
                  const file = await getInputRedirectionFileName(fileNameReplaced, force, context.httpFile.fileName);
                  console.log(`File name is ${file}`);
                  if (file) {
                    if (typeof body === 'string') {
                      await fileProvider.writeBuffer(file, Buffer.from(body));
                    } else {
                      await fileProvider.writeBuffer(file, body);
                    }
                  } else {
                    log.debug(`file ${fileName} not found`);
                  }
                } else {
                  log.debug(`file ${fileName} not found`);
                }
              }
            } catch (err) {
              log.error(`input redirection failed for ${fileName}`, err);
            }
          });
        }

        const fileImport = utils.parseFileImport(next.value.textLine);
        if (fileImport) {
          requestBody.rawBody.push(fileImport);
          requestBody.symbol.children?.push(
            new models.HttpSymbol({
              name: 'filename',
              description: fileImport.fileName,
              kind: models.HttpSymbolKind.path,
              startLine: next.value.line,
              startOffset: next.value.textLine.indexOf(fileImport.fileName),
              endLine: next.value.line,
              endOffset: next.value.textLine.indexOf(fileImport.fileName) + fileImport.fileName.length,
            })
          );
        } else {
          requestBody.rawBody.push(next.value.textLine);
        }

        return {
          nextParserLine: next.value.line,
          symbols,
        };
      }
    }
  }
  return false;
}

export function getRequestBody(context: models.ParserContext) {
  let result = context.data.request_body;
  if (!result) {
    result = {
      rawBody: [],
    };
    context.data.request_body = result;
  }
  return result;
}

async function getInputRedirectionFileName(fileName: string, force: boolean, baseName: models.PathLike) {
  let file = await toAbsoluteFileName(fileName, baseName);

  if (!force) {
    if (await fileProvider.exists(file)) {
      const dotIndex = fileName.lastIndexOf('.');
      if (dotIndex > 0 && dotIndex < fileName.length - 2) {
        const path = fileName.slice(0, dotIndex);
        const extension = fileName.slice(dotIndex + 1);
        let index = 1;

        file = await toAbsoluteFileName(`${path}-${index}.${extension}`, baseName);
        while (await fileProvider.exists(file)) {
          file = await toAbsoluteFileName(`${path}-${index++}.${extension}`, baseName);
        }
      }
    }
  }
  return file;
}
async function toAbsoluteFileName(fileName: string, baseName: models.PathLike) {
  if (!(await fileProvider.isAbsolute(fileName))) {
    const dirName = fileProvider.dirname(baseName);
    if (dirName) {
      return fileProvider.joinPath(dirName, fileName);
    }
  }
  return fileName;
}
