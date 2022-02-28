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
    httpFiles?: Array<{ base: models.HttpFile; ref: models.HttpFile }>;
    globalScriptsExecuted?: Array<models.HttpFile>;
  };
}

class ImportMetaAction {
  id = 'import';

  constructor(private readonly fileName: string, private readonly httpFileStore: models.HttpFileStore) {}

  async process(context: ImportProcessorContext): Promise<boolean> {
    const httpFile = await utils.replaceFilePath(this.fileName, context, async (absoluteFileName: models.PathLike) => {
      io.log.trace(`parse imported file ${absoluteFileName}`);
      const text = await io.fileProvider.readFile(absoluteFileName, 'utf-8');
      const ref = await this.httpFileStore.getOrCreate(absoluteFileName, () => Promise.resolve(text), 0, {
        workingDir: context.httpFile.rootDir,
        config: context.config,
        activeEnvironment: context.httpFile.activeEnvironment,
      });
      if (!context.options.httpFiles) {
        context.options.httpFiles = [];
      }
      context.options.httpFiles.push({ base: context.httpFile, ref });
      return ref;
    });

    if (
      httpFile &&
      (!context.options.globalScriptsExecuted || context.options.globalScriptsExecuted.indexOf?.(httpFile) < 0)
    ) {
      if (!context.options.globalScriptsExecuted) {
        context.options.globalScriptsExecuted = [];
      }
      context.options.globalScriptsExecuted.push(httpFile);
      const cloneContext: ImportProcessorContext = {
        ...context,
        httpFile,
      };
      io.log.trace(`execute global scripts for import ${httpFile.fileName}`);
      return await utils.executeGlobalScripts(cloneContext);
    }
    return !!httpFile;
  }
}
