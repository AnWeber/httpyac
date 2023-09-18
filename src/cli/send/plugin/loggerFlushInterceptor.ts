import { HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export const loggerFlushInterceptor = {
  id: 'loggerFlush',
  afterLoop: async function flushLogger(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) {
    const context = hookContext.args[0];
    context?.scriptConsole?.flush?.();
    return true;
  },
};
