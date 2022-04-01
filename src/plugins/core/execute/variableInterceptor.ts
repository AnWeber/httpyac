import * as models from '../../../models';
import * as utils from '../../../utils';
import { HookCancel, HookInterceptor, HookTriggerContext } from 'hookpoint';

const VariableHookId = 'variable';

export class VariableInterceptor implements HookInterceptor<[models.ProcessorContext], boolean> {
  id = 'variable';

  async beforeLoop(hookContext: HookTriggerContext<[models.ProcessorContext], true>) {
    const context = hookContext.args[0];
    context.options.replaceVariables = true;
    return true;
  }

  async beforeTrigger(hookContext: HookTriggerContext<[models.ProcessorContext], true>) {
    const context = hookContext.args[0];
    if (hookContext.hookItem?.id !== VariableHookId) {
      if (context.options.replaceVariables) {
        await this.replaceAllVariables(context);
        delete context.options.replaceVariables;
      }
    }
    return true;
  }

  private async replaceAllVariables(context: models.ProcessorContext): Promise<boolean> {
    for (const [key, value] of Object.entries(context.variables)) {
      const result = await utils.replaceVariables(value, models.VariableType.variable, context);
      if (result !== HookCancel) {
        context.variables[key] = result;
      }
    }
    return true;
  }
}
