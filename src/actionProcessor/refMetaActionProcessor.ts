import { executeGlobalScripts, processHttpRegionActions } from '../utils';
import { ProcessorContext } from '../models';

export interface RefMetaHttpRegionData{
  name: string;
  force: boolean;
}

interface InternalRefData{
  globalScriptExecution?: boolean;
}

export async function refMetaActionProcessor(data: RefMetaHttpRegionData & InternalRefData, context: ProcessorContext): Promise<boolean> {
  for (const refHttpRegion of context.httpFile.httpRegions) {
    if (refHttpRegion.metaData.name === data.name
      && !refHttpRegion.metaData.disabled
      && refHttpRegion !== context.httpRegion) {
      if (data.force || !refHttpRegion.response) {
        if (!data.globalScriptExecution || await executeGlobalScripts(context.httpFile, context.variables, context.httpClient)) {
          delete data.globalScriptExecution;

          const refContext = { ...context, httpRegion: refHttpRegion };
          if (await processHttpRegionActions(refContext)) {
            return true;
          }
        }
      }
    }
  }
  if (context.httpFile.imports) {
    for (const httpFileLoader of context.httpFile.imports) {
      const refHttpFile = await httpFileLoader();
      data.globalScriptExecution = true;
      const fileContext = { ...context, httpFile: refHttpFile };
      await refMetaActionProcessor(data, fileContext);
    }
  }
  return true;
};