import * as models from '../../../models';
import { toEnvironmentKey } from '../../../utils';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';

interface RegionScopedVariableOptions {
  variables?: models.Variables;
}

export class RegionScopedVariablesInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'regionScopedVariables';
  async beforeLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    const env = toEnvironmentKey(context.httpFile.activeEnvironment);
    if (context.config?.useRegionScopedVariables) {
      const httpRegions = context.httpFile.httpRegions.filter(obj => obj.isGlobal());
      const regionScopedVariables: RegionScopedVariableOptions = context.options;
      regionScopedVariables.variables = context.variables;
      context.variables = Object.assign({}, context.variables, ...httpRegions.map(obj => obj.variablesPerEnv[env]));
    } else {
      context.variables = Object.assign(
        context.variables,
        ...context.httpFile.httpRegions.map(obj => obj.variablesPerEnv[env])
      );
    }

    return true;
  }
  async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (context.config?.useRegionScopedVariables) {
      const regionScopedVariables: RegionScopedVariableOptions = context.options;
      if (regionScopedVariables.variables) {
        const newVariables = context.variables;
        context.variables = regionScopedVariables.variables;
        this.autoShareNewVariables(newVariables, context);
      }
    }
    return true;
  }

  private autoShareNewVariables(variables: models.Variables, context: models.ProcessorContext) {
    for (const [key, value] of Object.entries(variables)) {
      if (!context.variables[key]) {
        context.variables[key] = value;
      }
    }
  }
}
