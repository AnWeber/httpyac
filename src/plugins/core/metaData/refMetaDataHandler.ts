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
    let reference = this.findHttpRegionInContext(context.httpFile);
    if (!reference) {
      reference = this.findHttpRegionInImportedContext(context);
    }

    if (reference) {
      const envKey = utils.toEnvironmentKey(context.httpFile.activeEnvironment);
      log.trace('import variables', reference.httpRegion.variablesPerEnv[envKey]);
      Object.assign(context.variables, reference.httpRegion.variablesPerEnv[envKey]);
      if (this.data.force || !context.variables[this.data.name]) {
        const refContext = {
          ...context,
          httpFile: reference.httpFile,
          httpRegion: reference.httpRegion,
        };
        return await utils.processHttpRegionActions(refContext);
      }
      return true;
    }
    return true;
  }

  private findHttpRegionInContext(httpFile: models.HttpFile) {
    const httpRegion = httpFile.httpRegions.find(
      refHttpRegion => refHttpRegion.metaData.name === this.data.name && !refHttpRegion.metaData.disabled
    );
    if (httpRegion) {
      return {
        httpRegion,
        httpFile,
      };
    }
    return undefined;
  }

  private findHttpRegionInImportedContext(context: ImportProcessorContext) {
    if (context.options.httpFiles) {
      for (const { ref } of context.options.httpFiles.filter(obj => obj.base === context.httpFile)) {
        const reference = this.findHttpRegionInContext(ref);
        if (reference) {
          return reference;
        }
      }
    }
    return undefined;
  }
}
