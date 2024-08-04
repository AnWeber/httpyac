import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../models';
import { addTestResultToHttpRegion, isError, parseError } from '../../utils';

export class TestFailedInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'testFailed';
  before = ['processedHttpRegion'];

  public async onError(
    err: unknown,
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    if (isError(err)) {
      const { httpRegion } = hookContext.args[0];
      addTestResultToHttpRegion(httpRegion, {
        message: err.message,
        error: parseError(err),
        status: models.TestResultStatus.ERROR,
      });
    }
    return true;
  }
}
