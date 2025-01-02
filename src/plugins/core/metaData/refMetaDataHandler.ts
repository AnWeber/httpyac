import { log } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';
import { addSkippedTestResult } from '../../../utils';

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
    const name = await utils.replaceVariables(this.data.name, this.id, context);
    if (typeof name !== 'string' || !name) {
      log.error(`ref ${this.data.name} not resolvable to a valid name: ${this.data.name} -> ${name}`);
      throw new Error(`ref ${this.data.name} not resolvable to a valid name: ${this.data.name} -> ${name}`);
    }
    let result = true;
    utils.report(context, `load reference ${name}`);
    const reference = utils.findHttpRegionInContext(name, context);
    if (reference) {
      if (this.isReferenceErroredOrSkipped(reference)) {
        addSkippedTestResult(context.httpRegion);
        return false;
      }

      const envKey = utils.toEnvironmentKey(context.activeEnvironment);
      utils.setVariableInContext(reference.variablesPerEnv[envKey], context);
      log.trace('import variables', reference.variablesPerEnv[envKey]);

      const isNotExecuted =
        utils.isUndefined(context.variables[name]) && !context.processedHttpRegions?.some(p => p.id === reference.id);
      if (this.data.force || isNotExecuted) {
        result = await reference.execute(context);
        if (result) {
          // ref to ref variable export
          utils.setVariableInContext(reference.variablesPerEnv[envKey], context);
        }
      }
    } else {
      log.error(`ref ${name} not found`);
      throw new Error(`ref ${name} not found`);
    }
    return result;
  }

  private isReferenceErroredOrSkipped(ref: models.HttpRegion) {
    return !!ref.testResults?.some(
      t => t.status === models.TestResultStatus.ERROR || t.status === models.TestResultStatus.SKIPPED
    );
  }
}
