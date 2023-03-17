import { log, fileProvider } from '../io';
import * as models from '../models';
import { executeGlobalScripts } from './httpRegionUtils';
import { replaceFilePath } from './variableUtils';

interface ImportProcessorContext extends models.ProcessorContext {
  options: {
    httpFiles?: Array<{ base: models.HttpFile; ref: models.HttpFile }>;
    globalScriptsExecuted?: Array<models.HttpFile>;
  };
}

export function isHttpRegionSendContext(context: models.SendContext): context is models.HttpRegionSendContext {
  const guard = context as models.HttpRegionSendContext;
  return !!guard?.httpRegion;
}

export function isHttpRegionsSendContext(context: models.SendContext): context is models.HttpRegionsSendContext {
  const guard = context as models.HttpRegionsSendContext;
  return Array.isArray(guard?.httpRegions);
}

export function findHttpRegionInContext(name: string, context: ImportProcessorContext) {
  const refHttpRegion = context.httpFile.findHttpRegion(name);
  if (refHttpRegion) {
    return refHttpRegion;
  }
  if (context.options.httpFiles) {
    for (const { ref } of context.options.httpFiles.filter(obj => obj.base === context.httpFile)) {
      const reference = ref.findHttpRegion(name);
      if (reference) {
        return reference;
      }
    }
  }
  return undefined;
}

export async function importHttpFileInContext(
  fileName: string,
  httpFileStore: models.HttpFileStore,
  context: ImportProcessorContext
) {
  const httpFile = await replaceFilePath(fileName, context, async (absoluteFileName: models.PathLike) => {
    log.trace(`parse imported file ${absoluteFileName}`);
    if (!context.options.httpFiles) {
      context.options.httpFiles = [];
    }
    const httpFile = context.options.httpFiles.find(obj => obj.ref.fileName === absoluteFileName);
    if (httpFile) {
      return httpFile.ref;
    }
    const ref = await httpFileStore.getOrCreate(
      absoluteFileName,
      async () => await fileProvider.readFile(absoluteFileName, 'utf-8'),
      0,
      {
        workingDir: context.httpFile.rootDir,
        config: context.config,
        activeEnvironment: context.httpFile.activeEnvironment,
      }
    );
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
    log.trace(`execute global scripts for import ${httpFile.fileName}`);
    context.options.globalScriptsExecuted.push(httpFile);
    const cloneContext: ImportProcessorContext = {
      ...context,
      httpFile,
    };
    const globResult = await executeGlobalScripts(cloneContext);

    return globResult;
  }
  return !!httpFile;
}
