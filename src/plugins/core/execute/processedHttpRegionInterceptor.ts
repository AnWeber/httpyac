import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';

export class ProcessedHttpRegionInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  id = 'processedHttpRegion';

  public getResponseLoggingInterceptor(): HookInterceptor<
    [models.HttpResponse, models.ProcessorContext],
    boolean | void
  > {
    return {
      id: this.id,
      afterLoop: this.afterResponseLoggingLoop.bind(this),
    };
  }

  public async beforeLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const [context] = hookContext.args;
    if (context.processedHttpRegions) {
      const processedHttpRegion = this.toProcessedHttpRegion(context);
      context.processedHttpRegions.push(processedHttpRegion);
    }
    return true;
  }

  public async onError(
    _err: unknown,
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    this.updateProcessedHttpRegionAfterLoop(hookContext.args[0]);
    return true;
  }

  public async afterLoop(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    this.updateProcessedHttpRegionAfterLoop(hookContext.args[0]);
    return true;
  }

  private updateProcessedHttpRegionAfterLoop(context: models.ProcessorContext) {
    const processedHttpRegion = context.processedHttpRegions
      ?.slice()
      .reverse()
      ?.find(obj => obj.id === context.httpRegion.id);
    if (processedHttpRegion) {
      processedHttpRegion.end = performance.now();
      processedHttpRegion.duration = processedHttpRegion.end - processedHttpRegion.start;
      processedHttpRegion.metaData = {
        ...context.httpRegion.metaData,
      };
      processedHttpRegion.testResults = context.httpRegion.testResults;
    }
  }

  private async afterResponseLoggingLoop(
    hookContext: HookTriggerContext<[models.HttpResponse, models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const [response, context] = hookContext.args;

    const processedHttpRegion = context.processedHttpRegions?.find(obj => obj.id === context.httpRegion.id);
    if (processedHttpRegion) {
      processedHttpRegion.request = response.request;
      processedHttpRegion.response = response;
    }
    return true;
  }

  private toProcessedHttpRegion(context: models.ProcessorContext): models.ProcessedHttpRegion {
    return {
      id: context.httpRegion.id,
      filename: context.httpFile.fileName,
      symbol: context.httpRegion.symbol,
      isGlobal: context.httpRegion.isGlobal(),
      testResults: context.httpRegion.testResults,
      start: performance.now(),
    };
  }
}
