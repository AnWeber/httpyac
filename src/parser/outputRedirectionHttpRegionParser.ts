import { fileProvider, log } from '../io';
import * as models from '../models';
import { ParserRegex } from './parserRegex';

export async function parseOutputRedirection(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();

  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;

    const match = ParserRegex.outputRedirection.exec(textLine);
    if (match && match.groups?.fileName) {
      const fileName = match.groups.fileName;
      const force = !!match.groups.force;

      httpRegion.hooks.onResponse.addHook('outputRedirection', async (response, context) => {
        try {
          if (response.rawBody) {
            const file = await getOutputRedirectionFileName(fileName, force, context.httpFile.fileName);
            if (file) {
              await fileProvider.writeBuffer(file, response.rawBody);
            } else {
              log.debug(`file ${fileName} not found`);
            }
          }
        } catch (err) {
          log.error(`outputredirection failed for ${fileName}`, err);
        }
        return response;
      });
      return {
        nextParserLine: next.value.line,
        symbols: [
          {
            name: match.groups.key,
            description: match.groups.value,
            kind: models.HttpSymbolKind.response,
            startLine: next.value.line,
            startOffset: 0,
            endLine: next.value.line,
            endOffset: next.value.textLine.length,
          },
        ],
      };
    }
  }
  return false;
}

async function getOutputRedirectionFileName(fileName: string, force: boolean, baseName: models.PathLike) {
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
