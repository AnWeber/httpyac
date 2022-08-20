import * as io from '../../../io';
import * as models from '../../../models';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';

export class DisabledInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'disabled';
  async beforeLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    await this.checkForDisabled(hookContext);
    return true;
  }

  async afterTrigger(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    if (hookContext.index + 1 < hookContext.length) {
      await this.checkForDisabled(hookContext);
    }
    return true;
  }

  private async checkForDisabled(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>) {
    const context = hookContext.args[0];
    if (context.httpRegion.metaData.disabled) {
      if (context.httpRegion.metaData.disabled === true) {
        this.breakHookLoop(hookContext);
      } else {
        const result = await io.javascriptProvider.evalExpression(context.httpRegion.metaData.disabled, context);
        if (result) {
          this.breakHookLoop(hookContext);
        }
      }
    }
  }

  private breakHookLoop(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>) {
    hookContext.index = hookContext.length;
  }
}
