import { HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export const bailOnFailedTestInterceptor = {
  id: 'bailOnFailed',
  afterTrigger: async function bail(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) {
    const context = hookContext.args[0];
    const failedTest = context.httpRegion.testResults?.find?.(obj =>
      [models.TestResultStatus.FAILED, models.TestResultStatus.ERROR].includes(obj.status)
    );
    if (failedTest) {
      throw failedTest.error || new Error('bail on failed test');
    }
    return true;
  },
};
