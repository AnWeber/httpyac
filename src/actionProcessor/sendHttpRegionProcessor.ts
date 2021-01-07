import { HttpRegion, HttpFile } from '../httpRegion';
import {sendHttpRegion} from '../utils';

export interface SendHttpRegionData{
  name: string;
  alwaysSend: boolean;
}

export async function sendHttpRegionActionProcessor(data: SendHttpRegionData, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>): Promise<void> {

  const refHttpRegion = httpFile.httpRegions.find(obj => obj.metaParams?.name === data.name);
  if (refHttpRegion && refHttpRegion !== httpRegion) {
    if (data.alwaysSend || !refHttpRegion.response) {
      await sendHttpRegion(refHttpRegion, httpFile, variables);
    }
  } else if (httpFile.imports) {
    for (const httpFileLoader of httpFile.imports) {
      const refHttpFile = await httpFileLoader();
      await sendHttpRegionActionProcessor(data, httpRegion, refHttpFile, variables);
    }
  }
};