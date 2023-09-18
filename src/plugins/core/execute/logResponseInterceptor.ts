import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';
import * as utils from '../../../utils';

export class LogResponseInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'logResponse';
  async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (context.httpRegion.response) {
      const processedHttpRegion = this.toProcessedHttpRegion(context);
      if (processedHttpRegion?.response) {
        processedHttpRegion.response.tags = processedHttpRegion.response.tags ?? [];
        processedHttpRegion.response.tags.push('httpRegion', context.isMainContext ? 'mainResponse' : 'refResponse');
        processedHttpRegion.response = await utils.logResponse(processedHttpRegion.response, context);
      }
      if (context.processedHttpRegions) {
        context.processedHttpRegions.push(processedHttpRegion);
      }
      delete context.httpRegion.response;
    }
    return true;
  }
  private toProcessedHttpRegion(context: models.ProcessorContext): models.ProcessedHttpRegion {
    return {
      metaData: context.httpRegion.metaData && {
        ...context.httpRegion.metaData,
      },
      symbol: context.httpRegion.symbol,
      testResults: context.httpRegion.testResults,
      request: context.httpRegion.request && {
        ...context.httpRegion.request,
      },
      response: context.httpRegion.response && utils.cloneResponse(context.httpRegion.response),
      isGlobal: context.httpRegion.isGlobal(),
    };
  }
}
