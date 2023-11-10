import { log } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';

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

  async process(context: models.ProcessorContext): Promise<boolean> {
    let result = true;
    utils.report(context, `load reference ${this.data.name}`);
    const reference = utils.findHttpRegionInContext(this.data.name, context);
    if (reference) {
      const envKey = utils.toEnvironmentKey(context.activeEnvironment);
      utils.setVariableInContext(reference.variablesPerEnv[envKey], context);
      log.debug('import variables', reference.variablesPerEnv[envKey]);
      if (this.data.force || utils.isUndefined(context.variables[this.data.name])) {
        result = await reference.execute(context);
        if (result) {
          // ref to ref variable export
          utils.setVariableInContext(reference.variablesPerEnv[envKey], context);
        }
      }
    } else {
      log.error(`ref ${this.data.name} not found`);
      throw new Error(`ref ${this.data.name} not found`);
    }
    return result;
  }
}
