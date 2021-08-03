import { ActionType, SeriesHook, ProcessorContext, HookInterceptor, HookTriggerContext, Variables, HttpRegion } from '../models';
import * as utils from '../utils';


export enum LoopMetaType{
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


export class LoopMetaAction implements HookInterceptor<ProcessorContext, boolean> {
  id = ActionType.loop;
  private iteration: AsyncGenerator<{
    index: number;
    variables: Variables
  }> | undefined;

  name: string | undefined;
  constructor(private readonly data: LoopMetaData) { }

  async beforeLoop(context: HookTriggerContext<ProcessorContext, boolean>) : Promise<boolean> {
    this.iteration = this.iterate(context.arg);
    this.name = context.arg.httpRegion.metaData.name;
    const next = await this.iteration.next();
    if (!next.done) {
      Object.assign(context.arg.variables, next.value.variables);
      return true;
    }
    return false;
  }

  async afterTrigger(context: HookTriggerContext<ProcessorContext, boolean>): Promise<boolean> {
    if (this.iteration && context.index + 1 === context.length) {
      const next = await this.iteration.next();
      if (!next.done) {
        Object.assign(context.arg.variables, next.value.variables);
        await utils.logResponse(context.arg);
        context.arg.httpRegion = this.createHttpRegionClone(context.arg.httpRegion, next.value.index);
        context.index = -1;
      }
    } else if (this.name && context.arg.variables[this.name]) {
      context.arg.variables[`${this.name}0`] = context.arg.variables[this.name];
    }
    return true;
  }

  private async *iterate(context: ProcessorContext) {
    switch (this.data.type) {
      case LoopMetaType.forOf:
        if (this.data.variable && this.data.iterable) {
          const array = await this.execExpression(this.data.iterable, context);
          let iterable: Array<unknown> | undefined;
          if (Array.isArray(array)) {
            iterable = array;
          }
          if (iterable) {
            let index = 0;
            for (const variable of iterable) {
              const variables: Variables = {
                '$index': index,
              };
              variables[this.data.variable] = variable;
              yield {
                index,
                variables
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
                '$index': index,
              }
            };
          }
        }
        break;
      case LoopMetaType.while:
        if (this.data.expression) {
          let index = 0;
          while (await this.execExpression(this.data.expression, context)) {
            yield {
              index,
              variables: {
                '$index': index,
              }
            };
            index++;
          }
        }
        break;
      default:
        break;
    }
  }

  private async execExpression(expression: string, context: ProcessorContext) {
    const script = `exports.$result = (${expression});`;
    let lineOffset = context.httpRegion.symbol.startLine;
    if (context.httpRegion.symbol.source) {
      const index = utils.toMultiLineArray(context.httpRegion.symbol.source).findIndex(line => line.indexOf(expression) >= 0);
      if (index >= 0) {
        lineOffset += index;
      }
    }
    const value = await utils.runScript(script, {
      fileName: context.httpFile.fileName,
      context: {
        httpFile: context.httpFile,
        httpRegion: context.httpRegion,
        console: context.scriptConsole,
        ...context.variables,
      },
      lineOffset,
    });
    return value.$result;
  }


  private createHttpRegionClone(httpRegion: HttpRegion, index: number): HttpRegion {
    return {
      metaData: {
        ...httpRegion.metaData,
        name: this.name ? `${this.name}${index}` : undefined
      },
      request: httpRegion.request ? {
        ...httpRegion.request
      } : undefined,
      symbol: httpRegion.symbol,
      hooks: {
        execute: new SeriesHook(obj => !obj)
      }
    };
  }
}
