import { HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';
import { addSkippedTestResult } from '../../../utils';

let bailInBeforeLoop = false;

export const bailOnFailedTestInterceptor = {
  id: 'bailOnFailed',
  beforeLoop: async function beforeLoop(hookContext: { args: [models.ProcessorContext] }) {
    if (bailInBeforeLoop) {
      const [context] = hookContext.args;
      addSkippedTestResult(context.httpRegion, 'request skipped because of bail');
      return false;
    }
    return true;
  },
  onError: async function bailOnError() {
    bailInBeforeLoop = true;
    return true;
  },
  afterTrigger: async function bail(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) {
    const context = hookContext.args[0];
    const failedTest = context.httpRegion.testResults?.find?.(obj =>
      [models.TestResultStatus.FAILED].includes(obj.status)
    );
    if (failedTest) {
      bailInBeforeLoop = true;
    }
    return true;
  },
};
