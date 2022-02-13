import * as io from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';

export function importMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'import' && value) {
    context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new ImportMetaAction(value, context.httpFileStore));
    return true;
  }
  return false;
}

export interface ImportProcessorContext extends models.ProcessorContext {
  options: {
    httpFiles?: Array<models.HttpFile>;
  };
}

class ImportMetaAction {
  id = 'import';

  constructor(private readonly fileName: string, private readonly httpFileStore: models.HttpFileStore) {}

  async process(context: ImportProcessorContext): Promise<boolean> {
    const httpFile = await utils.replaceFilePath(this.fileName, context, async (absoluteFileName: models.PathLike) => {
      io.log.trace(`parse imported file ${absoluteFileName}`);
      const text = await io.fileProvider.readFile(absoluteFileName, 'utf-8');
      const httpFile = await this.httpFileStore.getOrCreate(absoluteFileName, () => Promise.resolve(text), 0, {
        workingDir: context.httpFile.rootDir,
        config: context.config,
        activeEnvironment: context.httpFile.activeEnvironment,
      });
      if (!context.options.httpFiles) {
        context.options.httpFiles = [httpFile];
      } else {
        context.options.httpFiles.push(httpFile);
      }
      return httpFile;
    });

    if (httpFile) {
      const cloneContext: ImportProcessorContext = {
        ...context,
        httpFile,
      };
      io.log.trace(`execute global scripts for import ${httpFile.fileName}`);
      return await utils.executeGlobalScripts(cloneContext);
    }
    return false;
  }
}
