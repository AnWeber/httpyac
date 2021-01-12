import { HttpRegion, HttpFile } from '../httpRegion';
import { sendHttpRegion, processHttpRegionActions } from '../utils';

export interface RefMetaHttpRegionData{
  name: string;
  force: boolean;
}

interface InternalRefData{
  sendNeeded?: boolean;
}

export async function refMetaHttpRegionActionProcessor(data: RefMetaHttpRegionData & InternalRefData, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>): Promise<void> {

  const refHttpRegion = httpFile.httpRegions.find(obj => !obj.metaParams.disabled && obj.metaParams.name === data.name);
  if (refHttpRegion && refHttpRegion !== httpRegion) {
    if (data.force || !refHttpRegion.response) {
      if (data.sendNeeded) {
        await sendHttpRegion(refHttpRegion, httpFile, variables);
      } else {
        await processHttpRegionActions(refHttpRegion, httpFile, variables);
      }
      data.sendNeeded = false;
    }
  } else if (httpFile.imports) {
    for (const httpFileLoader of httpFile.imports) {
      const refHttpFile = await httpFileLoader();
      data.sendNeeded = true;
      await refMetaHttpRegionActionProcessor(data, httpRegion, refHttpFile, variables);
    }
  }
};