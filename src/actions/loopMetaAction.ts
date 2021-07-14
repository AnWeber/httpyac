import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import * as utils from '../utils';
import { executeScript } from './javascriptAction';


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


export class LoopMetaAction implements HttpRegionAction {
  type = ActionType.loop;

  constructor(private readonly data: LoopMetaData) { }

  async process(context: ProcessorContext): Promise<boolean> {


    switch (this.data.type) {
      case LoopMetaType.forOf:
        if (this.data.variable && this.data.iterable) {
          const array = context.variables[this.data.iterable];
          let iterable: Array<unknown> | undefined;
          if (Array.isArray(array)) {
            iterable = array;
          }
          if (iterable) {
            for (const variable of iterable) {
              const cloneContext = this.createContextClone(context);
              context.variables[this.data.variable] = variable;
              await utils.processHttpRegionActions(cloneContext);
            }
          }
        }
        break;
      case LoopMetaType.for:
        if (this.data.counter) {
          for (let index = 0; index < this.data.counter; index++) {
            const cloneContext = this.createContextClone(context);
            context.variables.$index = index;
            await utils.processHttpRegionActions(cloneContext);
          }
        }
        break;
      case LoopMetaType.while:
        if (this.data.expression) {
          while (await this.execExpression(this.data.expression, context)) {
            const cloneContext = this.createContextClone(context);
            await utils.processHttpRegionActions(cloneContext);
          }
        }
        break;
      default:
        break;
    }

    return false;
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
    const value = await executeScript({
      script,
      fileName: context.httpFile.fileName,
      variables: context.variables,
      lineOffset,
    });
    return !!value.$result;
  }


  private createContextClone(context: ProcessorContext) {
    const result = {
      ...context,
    };
    result.httpRegion = {
      actions: [...context.httpRegion.actions.filter(obj => obj.type !== ActionType.loop)],
      metaData: context.httpRegion.metaData,
      request: context.httpRegion.request ? {
        ...context.httpRegion.request
      } : undefined,
      symbol: context.httpRegion.symbol
    };

    return result;
  }
}
