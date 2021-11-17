import { executeGlobalScripts, toAbsoluteFilename } from '../utils';
import { ActionType, HttpRegionAction, ProcessorContext, HttpFile } from '../models';
import { HttpFileStore } from '../store';
import { fileProvider, log } from '../io';


export interface ImportProcessorContext extends ProcessorContext{
  options: {
    httpFiles?: Array<HttpFile>
  }
}

export class ImportMetaAction implements HttpRegionAction {
  id = ActionType.import;

  constructor(
    private readonly fileName: string,
    private readonly httpFileStore: HttpFileStore
  ) { }

  async process(context: ImportProcessorContext): Promise<boolean> {
    const absoluteFileName = await toAbsoluteFilename(this.fileName, fileProvider.dirname(context.httpFile.fileName));
    if (absoluteFileName) {
      log.trace(`parse imported file ${absoluteFileName}`);
      const text = await fileProvider.readFile(absoluteFileName, 'utf-8');
      const importHttpFile = await this.httpFileStore.getOrCreate(absoluteFileName, () => Promise.resolve(text), 0, {
        workingDir: context.httpFile.rootDir,
        config: context.config,
        activeEnvironment: context.httpFile.activeEnvironment,
      });
      if (!context.options.httpFiles) {
        context.options.httpFiles = [importHttpFile];
      } else {
        context.options.httpFiles.push(importHttpFile);
      }

      const cloneContext: ImportProcessorContext = {
        ...context,
        httpFile: importHttpFile,
      };
      log.trace(`execute global scripts for import ${absoluteFileName}`);
      return await executeGlobalScripts(cloneContext);
    }
    return false;
  }
}
