import * as models from '../../models';
import { HookTriggerContext } from 'hookpoint';

export const loggerFlushInterceptor = {
  afterLoop: async function flushLogger(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) {
    const context = hookContext.args[0];
    context?.scriptConsole?.flush?.();
    return true;
  },
};
