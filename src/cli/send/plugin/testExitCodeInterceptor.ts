import { HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export const testExitCodeInterceptor = {
  id: 'testExitCode',

  onError: async function onError(): Promise<boolean | undefined> {
    process.exitCode = 10;
    return true;
  },

  afterTrigger: async function bail(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) {
    const context = hookContext.args[0];
    const hasFailedTestResult = context.httpRegion.testResults?.some?.(
      obj => obj.status === models.TestResultStatus.FAILED
    );
    if (hasFailedTestResult) {
      process.exitCode = 20;
    }
    return true;
  },
};
