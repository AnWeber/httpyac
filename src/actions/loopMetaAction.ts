import * as models from '../models';
import * as utils from '../utils';

export enum LoopMetaType {
  for,
  forOf,
  while,
}

export interface LoopMetaData {
  type: LoopMetaType;
  iterable?: string;
  variable?: string;
  counter?: number;
  expression?: string;
}

export class LoopMetaAction implements models.HookInterceptor<models.ProcessorContext, boolean> {
  id = models.ActionType.loop;
  private iteration:
    | AsyncGenerator<{
        index: number;
        variables: models.Variables;
      }>
    | undefined;

  name: string | undefined;
  constructor(private readonly data: LoopMetaData) {}

  async beforeLoop(context: models.HookTriggerContext<models.ProcessorContext, boolean>): Promise<boolean> {
    this.iteration = this.iterate(context.arg);
    this.name = context.arg.httpRegion.metaData.name;
    context.arg.progress?.report?.({
      message: 'start loop',
    });
    const next = await this.iteration.next();
    if (!next.done) {
      Object.assign(context.arg.variables, next.value.variables);
      return true;
    }
    return false;
  }

  async afterTrigger(context: models.HookTriggerContext<models.ProcessorContext, boolean>): Promise<boolean> {
    if (this.iteration && context.index + 1 === context.length) {
      const next = await this.iteration.next();

      if (!next.done) {
        context.arg.progress?.report?.({
          message: `${next.value.index} loop pass`,
        });
        Object.assign(context.arg.variables, next.value.variables);
        await utils.logResponse(context.arg.httpRegion.response, context.arg);
        context.arg.httpRegion = this.createHttpRegionClone(context.arg.httpRegion, next.value.index);
        context.index = -1;
      }
    } else if (this.name && context.arg.variables[this.name]) {
      context.arg.variables[`${this.name}0`] = context.arg.variables[this.name];
    }
    return true;
  }

  private async *iterate(context: models.ProcessorContext) {
    switch (this.data.type) {
      case LoopMetaType.forOf:
        if (this.data.variable && this.data.iterable) {
          const array = await utils.evalExpression(this.data.iterable, context);
          let iterable: Array<unknown> | undefined;
          if (Array.isArray(array)) {
            iterable = array;
          }
          if (iterable) {
            let index = 0;
            for (const variable of iterable) {
              const variables: models.Variables = {
                $index: index,
              };
              variables[this.data.variable] = variable;
              yield {
                index,
                variables,
              };
              index++;
            }
          }
        }
        break;
      case LoopMetaType.for:
        if (this.data.counter) {
          for (let index = 0; index < this.data.counter; index++) {
            yield {
              index,
              variables: {
                $index: index,
              },
            };
          }
        }
        break;
      case LoopMetaType.while:
        if (this.data.expression) {
          let index = 0;
          while (await utils.evalExpression(this.data.expression, context)) {
            yield {
              index,
              variables: {
                $index: index,
              },
            };
            index++;
          }
        }
        break;
      default:
        break;
    }
  }

  private createHttpRegionClone(httpRegion: models.HttpRegion, index: number): models.HttpRegion {
    return {
      metaData: {
        ...httpRegion.metaData,
        name: this.name ? `${this.name}${index}` : undefined,
      },
      request: httpRegion.request
        ? {
            ...httpRegion.request,
          }
        : undefined,
      symbol: httpRegion.symbol,
      hooks: {
        execute: new models.ExecuteHook(),
        onRequest: new models.OnRequestHook(),
        onStreaming: new models.OnStreaming(),
        onResponse: new models.OnResponseHook(),
        responseLogging: new models.ResponseLoggingHook(),
      },
      variablesPerEnv: httpRegion.variablesPerEnv,
    };
  }
}
