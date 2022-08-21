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
      utils.registerRegionDependent(
        context,
        reference.httpFile,
        reference.httpRegion,
        context.httpFile,
        context.httpRegion
      );
      const envKey = utils.toEnvironmentKey(context.httpFile.activeEnvironment);
      log.trace('import variables', reference.httpRegion.variablesPerEnv[envKey]);
      utils.setVariableInContext(reference.httpRegion.variablesPerEnv[envKey], context);
      if (this.data.force || utils.isUndefined(context.variables[this.data.name])) {
        const refContext = {
          ...context,
          httpFile: reference.httpFile,
          httpRegion: reference.httpRegion,
          isMainContext: false,
        };
        const result = await utils.processHttpRegionActions(refContext);
        if (result) {
          utils.setVariableInContext(refContext.httpRegion.variablesPerEnv[envKey], context);
        }
        return result;
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
