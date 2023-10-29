import { HookCancel, HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';
import * as utils from '../../../utils';

const VariableHookId = 'variable';

export class LazyVariableInterceptor implements HookInterceptor<[models.ProcessorContext], boolean> {
  id = 'variable';

  async beforeLoop(hookContext: HookTriggerContext<[models.ProcessorContext], true>) {
    const context = hookContext.args[0];
    context.options.lazyVariables = true;
    return true;
  }

  async beforeTrigger(hookContext: HookTriggerContext<[models.ProcessorContext], true>) {
    const context = hookContext.args[0];
    if (hookContext.hookItem?.id !== VariableHookId) {
      if (context.options.lazyVariables) {
        await this.replaceAllVariables(context);
        delete context.options.lazyVariables;
      }
    }
    return true;
  }

  private async replaceAllVariables(context: models.ProcessorContext): Promise<void> {
    for (const [key, value] of Object.entries(context.variables)) {
      const result = await utils.replaceVariables(value, models.VariableType.variable, context);
      if (result !== HookCancel) {
        context.variables[key] = result;
      }
    }
  }
}
