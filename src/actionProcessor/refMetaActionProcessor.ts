import { executeGlobalScripts, processHttpRegionActions } from '../utils';
import { ProcessorContext } from '../models';

export interface RefMetaHttpRegionData{
  name: string;
  force: boolean;
}

interface InternalRefData{
  globalScriptExecution?: boolean;
}

export async function refMetaActionProcessor(data: RefMetaHttpRegionData & InternalRefData, {httpRegion, httpFile, variables}: ProcessorContext): Promise<boolean> {
  for (const refHttpRegion of httpFile.httpRegions) {
    if (refHttpRegion.metaData.name === data.name
      && !refHttpRegion.metaData.disabled
      && refHttpRegion !== httpRegion) {
      if (data.force || !refHttpRegion.response) {
        if (!data.globalScriptExecution || await executeGlobalScripts(httpFile, variables)) {
          delete data.globalScriptExecution;
          if (await processHttpRegionActions({ httpRegion: refHttpRegion, httpFile, variables })) {
            return true;
          }
        }
      }
    }
  }
  if (httpFile.imports) {
    for (const httpFileLoader of httpFile.imports) {
      const refHttpFile = await httpFileLoader();
      data.globalScriptExecution = true;
      await refMetaActionProcessor(data, { httpRegion, httpFile: refHttpFile, variables });
    }
  }
  return true;
};