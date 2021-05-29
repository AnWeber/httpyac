import { executeGlobalScripts, processHttpRegionActions } from '../utils';
import { ActionType, HttpRegionAction, ProcessorContext } from '../models';

export interface RefMetaHttpRegionData {
  name: string;
  force: boolean;
}

interface InternalRefData {
  globalScriptExecution?: boolean;
}

export class RefMetaAction implements HttpRegionAction {
  type = ActionType.ref;

  constructor(private readonly data: RefMetaHttpRegionData) { }

  async process(context: ProcessorContext): Promise<boolean> {
    return await this.processInternal(this.data, context);
  }

  private async processInternal(data: RefMetaHttpRegionData & InternalRefData, context: ProcessorContext): Promise<boolean> {
    for (const refHttpRegion of context.httpFile.httpRegions) {
      if (refHttpRegion.metaData.name === data.name
        && !refHttpRegion.metaData.disabled
        && refHttpRegion !== context.httpRegion) {
        if (data.force || !refHttpRegion.response || !context.variables[data.name]) {
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
        await this.processInternal(data, fileContext);
      }
    }
    return true;
  }
}
