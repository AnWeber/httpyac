import { HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export const testExitCodeInterceptor = {
  id: 'testExitCode',
  afterTrigger: async function bail(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) {
    const context = hookContext.args[0];
    const failedTest = context.httpRegion.testResults?.some?.(obj =>
      [models.TestResultStatus.FAILED, models.TestResultStatus.ERROR].includes(obj.status)
    );
    if (failedTest) {
      process.exitCode = 20;
    }
    return true;
  },
};
