import * as models from '../../../models';
import * as utils from '../../../utils';

import { HookInterceptor, HookTriggerContext } from 'hookpoint';

export class MetaDataNameInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'metaDataName';
  async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (!context.httpRegion.response || !utils.isString(context.httpRegion.metaData.name)) {
      return true;
    }

    if (
      context.httpRegion.testResults &&
      context.httpRegion.testResults.some(t => t.status !== models.TestResultStatus.SUCCESS)
    ) {
      return true;
    }

    const name = context.httpRegion.metaData.name
      .trim()
      .replace(/\s/gu, '-')
      .replace(/-./gu, value => value[1].toUpperCase());
    utils.setVariableInContext(
      {
        [name]: context.httpRegion.response.parsedBody || context.httpRegion.response.body,
        [`${name}Response`]: context.httpRegion.response,
      },
      context
    );

    return true;
  }
}
