import { HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export const testExitCodeInterceptor = {
  id: 'testExitCode',
  afterTrigger: async function bail(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) {
    const context = hookContext.args[0];
    const failedTest = context.httpRegion.testResults?.find?.(obj => !obj.result);
    if (failedTest) {
      process.exitCode = 20;
    }
    return true;
  },
};
