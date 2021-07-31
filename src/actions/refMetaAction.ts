import { processHttpRegionActions } from '../utils';
import { ActionType, HttpRegionAction } from '../models';
import { ImportProcessorContext } from './importMetaAction';

export interface RefMetaHttpRegionData {
  name: string;
  force: boolean;
}

export class RefMetaAction implements HttpRegionAction {
  id = ActionType.ref;

  constructor(private readonly data: RefMetaHttpRegionData) { }

  async process(context: ImportProcessorContext): Promise<boolean> {
    for (const refHttpRegion of context.httpFile.httpRegions) {
      if (refHttpRegion.metaData.name === this.data.name
        && !refHttpRegion.metaData.disabled
        && refHttpRegion !== context.httpRegion) {
        if (this.data.force || !refHttpRegion.response || !context.variables[this.data.name]) {
          const refContext = { ...context, httpRegion: refHttpRegion };
          if (await processHttpRegionActions(refContext)) {
            return true;
          }
        }
      }
    }
    if (context.httpFiles) {
      for (const refHttpFile of context.httpFiles) {
        const cloneContext = {
          ...context,
          httpFile: refHttpFile
        };
        delete cloneContext.httpFiles;
        await this.process(cloneContext);
      }
    }
    return true;
  }
}
