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

    if (context.httpRegion.testResults === undefined) {
      return true;
    }

    let hasErroredTestResult = false;
    let hasFailedTestResult = false;

    for (const testResult of context.httpRegion.testResults) {
      if (testResult.status === models.TestResultStatus.ERROR) {
        hasErroredTestResult = true;
        break;
      }
      if (testResult.status === models.TestResultStatus.FAILED) {
        hasFailedTestResult = true;
      }
    }

    if (hasErroredTestResult) {
      process.exitCode = 19;
    } else if (hasFailedTestResult) {
      process.exitCode = 20;
    }

    return true;
  },
};
