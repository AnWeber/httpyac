import { fileProvider, log } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';

export async function parseOutputRedirection(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();

  const next = lineReader.next();
  if (!next.done) {
    const textLine = next.value.textLine;

    const match = /^\s*>>(?<force>!)?\s+(?<fileName>.+)\s*$/u.exec(textLine);
    if (match && match.groups?.fileName) {
      const fileName = match.groups.fileName.trim();
      const force = !!match.groups.force;

      httpRegion.hooks.onResponse.addHook('outputRedirection', async (response, context) => {
        try {
          if (response.rawBody) {
            const fileNameReplaced = utils.toString(
              await utils.replaceVariables(fileName, models.VariableType.variable, context)
            );

            if (fileNameReplaced) {
              const file = await getOutputRedirectionFileName(fileNameReplaced, force, context.httpFile.fileName);
              if (file) {
                await fileProvider.writeBuffer(file, response.rawBody);
              } else {
                log.debug(`file ${fileName} not found`);
              }
            } else {
              log.debug(`file ${fileName} not found`);
            }
          }
        } catch (err) {
          log.error(`output redirection failed for ${fileName}`, err);
        }
      });
      return {
        nextParserLine: next.value.line,
        symbols: [
          new models.HttpSymbol({
            name: `outputredirection`,
            description: match.groups.filename,
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
