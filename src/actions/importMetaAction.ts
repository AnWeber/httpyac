import { fileProvider, log } from '../io';
import * as models from '../models';
import { HttpFileStore } from '../store';
import * as utils from '../utils';

export interface ImportProcessorContext extends models.ProcessorContext {
  options: {
    httpFiles?: Array<models.HttpFile>;
  };
}

export class ImportMetaAction implements models.HttpRegionAction {
  id = models.ActionType.import;

  constructor(private readonly fileName: string, private readonly httpFileStore: HttpFileStore) {}

  async process(context: ImportProcessorContext): Promise<boolean> {
    const httpFile = await utils.replaceFilePath(this.fileName, context, async (absoluteFileName: models.PathLike) => {
      log.trace(`parse imported file ${absoluteFileName}`);
      const text = await fileProvider.readFile(absoluteFileName, 'utf-8');
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
      log.trace(`execute global scripts for import ${httpFile.fileName}`);
      return await utils.executeGlobalScripts(cloneContext);
    }
    return false;
  }
}
