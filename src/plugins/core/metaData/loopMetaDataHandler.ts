import * as models from '../../../models';
import * as utils from '../../../utils';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import cloneDeep from 'lodash/cloneDeep';
import { v4 as uuid } from 'uuid';

export function loopMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext): boolean {
  if (type === 'loop' && value) {
    const forOfMatch = /^\s*for\s+(?<variable>.*)\s+of\s+(?<iterable>.*)\s*/u.exec(value);
    if (forOfMatch?.groups?.iterable && forOfMatch?.groups?.variable) {
      addHook(context, {
        type: LoopMetaType.forOf,
        variable: forOfMatch.groups.variable,
        iterable: forOfMatch.groups.iterable,
      });
      return true;
    }
    const forMatch = /^\s*for\s*(?<counter>\d*)\s*$/u.exec(value);
    if (forMatch?.groups?.counter) {
      addHook(context, {
        type: LoopMetaType.for,
        counter: Number.parseInt(forMatch.groups.counter, 10),
      });
      return true;
    }
    const whileMatch = /^\s*while\s*(?<expression>.*)\s*$/u.exec(value);
    if (whileMatch?.groups?.expression) {
      addHook(context, {
        type: LoopMetaType.while,
        expression: whileMatch.groups.expression,
      });
      return true;
    }
  }
  return false;
}

function addHook(context: models.ParserContext, data: Omit<LoopMetaData, 'index'>) {
  const loopAction = new LoopMetaAction(data);
  context.httpRegion.hooks.execute.addObjHook(obj => obj.process, loopAction);
  context.httpRegion.hooks.execute.addInterceptor(loopAction);
}

enum LoopMetaType {
  for,
  forOf,
  while,
}

interface LoopMetaData {
  type: LoopMetaType;
  iterable?: string;
  variable?: string;
  counter?: number;
  expression?: string;
}

class LoopMetaAction implements HookInterceptor<[models.ProcessorContext], boolean> {
  id;
  private iteration:
    | AsyncGenerator<{
        index: number;
        variables: models.Variables;
      }>
    | undefined;

  name: string | undefined;
  index = 0;
  request: models.Request | undefined;
  constructor(private readonly data: LoopMetaData) {
    this.id = `loop_${uuid()}`;
  }

  async beforeTrigger(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>): Promise<boolean> {
    if (hookContext.hookItem?.id === this.id) {
      this.index = hookContext.index;
    }
    return true;
  }

  async process(context: models.ProcessorContext): Promise<boolean> {
    this.iteration = this.iterate(context);
    this.name = context.httpRegion.metaData.name;
    utils.report(context, 'start loop');
    const next = await this.iteration.next();
    if (!next.done) {
      if (context.request) {
        this.request = cloneDeep(context.request);
      }
      Object.assign(context.variables, next.value.variables);
      return true;
    }
    return false;
  }

  async afterTrigger(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>): Promise<boolean> {
    const context = hookContext.args[0];
    if (this.iteration && hookContext.index + 1 === hookContext.length) {
      this.setResponsesList(context);
      const next = await this.iteration.next();

      if (!next.done) {
        utils.report(context, `${next.value.index} loop pass`);
        Object.assign(context.variables, next.value.variables);
        await utils.logResponse(context.httpRegion.response, context);
        context.httpRegion = this.createHttpRegionClone(context.httpRegion, next.value.index);
        if (this.request) {
          context.request = cloneDeep(this.request);
        }
        hookContext.index = this.index;
      }
    } else if (this.name && context.variables[this.name]) {
      utils.setVariableInContext(
        {
          [`${this.name}0`]: context.variables[this.name],
          [`${this.name}0Response`]: context.variables.response,
        },
        context
      );
    }

    return true;
  }

  private setResponsesList(context: models.ProcessorContext) {
    const listName = `${this.name}List`;
    let responses: unknown = context.variables[listName];
    if (!responses) {
      responses = [];
      utils.setVariableInContext(
        {
          [listName]: responses,
        },
        context
      );
    }
    if (Array.isArray(responses) && utils.isHttpResponse(context.variables.response)) {
      responses.push(utils.shrinkCloneResponse(context.variables.response));
    }
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
