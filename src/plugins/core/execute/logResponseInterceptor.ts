import * as models from '../../../models';
import * as utils from '../../../utils';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';

export class LogResponseInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (context.httpRegion.response) {
      const processedHttpRegion = this.toProcessedHttpRegion(context);
      processedHttpRegion.response = await utils.logResponse(processedHttpRegion?.response, context);
      if (context.processedHttpRegions && !utils.isGlobalHttpRegion(context.httpRegion)) {
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
    };
  }
}
