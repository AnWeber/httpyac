import { log } from '../io';
import { ActionType, HttpRegionAction } from '../models';
import * as utils from '../utils';
import { ImportProcessorContext } from './importMetaAction';

export interface RefMetaHttpRegionData {
  name: string;
  force: boolean;
}

export class RefMetaAction implements HttpRegionAction {
  id = ActionType.ref;

  constructor(private readonly data: RefMetaHttpRegionData) {}

  async process(context: ImportProcessorContext): Promise<boolean> {
    utils.report(context, `load reference ${this.data.name}`);
    for (const refHttpRegion of context.httpFile.httpRegions) {
      if (
        refHttpRegion.metaData.name === this.data.name &&
        !refHttpRegion.metaData.disabled &&
        refHttpRegion !== context.httpRegion
      ) {
        const envkey = utils.toEnvironmentKey(context.httpFile.activeEnvironment);
        log.trace('import variables', refHttpRegion.variablesPerEnv[envkey]);
        Object.assign(context.variables, refHttpRegion.variablesPerEnv[envkey]);
        if (this.data.force || !context.variables[this.data.name]) {
          const refContext = { ...context, httpRegion: refHttpRegion };
          await utils.processHttpRegionActions(refContext);
        }
        return true;
      }
    }
    if (context.options.httpFiles) {
      for (const refHttpFile of context.options.httpFiles) {
        const cloneContext = {
          ...context,
          options: {
            ...context.options,
          },
          httpFile: refHttpFile,
        };
        delete cloneContext.options.httpFiles;
        await this.process(cloneContext);
      }
    }
    return true;
  }
}
