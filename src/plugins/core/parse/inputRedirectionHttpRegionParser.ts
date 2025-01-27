import { fileProvider, log } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';
import { transformToBufferOrString } from '../request';

export async function parseInputRedirection(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  if (context.httpRegion.request) {
    const lineReader = getLineReader();

    const next = lineReader.next();
    if (!next.done) {
      const textLine = next.value.textLine;

      console.log(`file Calling input redirection parser${textLine}`);

      const match = /^<(?:(?<injectVariables>@)(?<encoding>\w+)?)?\s+(?<fileName>.+?)\s*$/u.exec(textLine);

      if (match && match.groups?.fileName) {
        console.log(match.groups.fileName.trim());
        const fileName = `redirect-actual-${match.groups.fileName.trim()}`;
        const force: boolean = true;

        context.httpRegion.hooks.onRequest.addHook('inputRedirection', async (request, context) => {
          try {
            console.log(`file request body is ${request.body}`);
            if (request.body) {
              console.log('file Request body is present');
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
        return {
          nextParserLine: next.value.line,
          symbols: [
            new models.HttpSymbol({
              name: match.groups.key,
              description: match.groups.value,
              kind: models.HttpSymbolKind.response,
              startLine: next.value.line,
              startOffset: 0,
              endLine: next.value.line,
              endOffset: next.value.textLine.length,
              children: [
                new models.HttpSymbol({
                  name: 'filename',
                  description: fileName,
                  kind: models.HttpSymbolKind.path,
                  startLine: next.value.line,
                  startOffset: next.value.textLine.indexOf(fileName),
                  endLine: next.value.line,
                  endOffset: next.value.textLine.indexOf(fileName) + fileName.length,
                }),
              ],
            }),
          ],
        };
      }
    }
  }
  return false;
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
