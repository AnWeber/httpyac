import { log } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';
import { ImportProcessorContext } from './importMetaDataHandler';

export function refMetaDataHandler(type: string, name: string | undefined, context: models.ParserContext): boolean {
  if (['ref', 'forceRef'].indexOf(type) >= 0 && name) {
    context.httpRegion.hooks.execute.addObjHook(
      obj => obj.process,
      new RefMetaAction({
        name,
        force: type === 'forceRef',
      })
    );
    return true;
  }
  return false;
}

export interface RefMetaHttpRegionData {
  name: string;
  force: boolean;
}

class RefMetaAction {
  id = 'ref';

  constructor(private readonly data: RefMetaHttpRegionData) {}

  async process(context: ImportProcessorContext): Promise<boolean> {
    utils.report(context, `load reference ${this.data.name}`);
    for (const refHttpRegion of context.httpFile.httpRegions) {
      if (
        refHttpRegion.metaData.name === this.data.name &&
        !refHttpRegion.metaData.disabled &&
        refHttpRegion !== context.httpRegion
      ) {
        const envKey = utils.toEnvironmentKey(context.httpFile.activeEnvironment);
        log.trace('import variables', refHttpRegion.variablesPerEnv[envKey]);
        Object.assign(context.variables, refHttpRegion.variablesPerEnv[envKey]);
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
