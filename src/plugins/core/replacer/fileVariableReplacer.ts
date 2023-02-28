import { fileProvider } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';

export async function replaceFileImport(
  text: unknown,
  type: models.VariableType | string,
  context: models.ProcessorContext
): Promise<unknown> {
  return utils.parseHandlebarsString(text, async (variable: string) => {
    const fileImport = utils.parseFileImport(variable);
    if (fileImport) {
      let fileContent: unknown = await utils.replaceFilePath(
        fileImport.fileName,
        context,
        async (path: models.PathLike) => {
          if (fileImport.injectVariables || fileImport.encoding) {
            return await fileProvider.readFile(path, fileImport.encoding);
          }
          return fileProvider.readBuffer(path);
        }
      );
      if (fileImport.injectVariables) {
        fileContent = await utils.replaceVariables(fileContent, type, context);
      }
      return fileContent;
    }
    return undefined;
  });
}
