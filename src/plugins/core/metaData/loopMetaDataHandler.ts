import * as io from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';
import { HookCancel, HookInterceptor, HookTriggerContext } from 'hookpoint';

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
  const loopAction = new LoopMetaInterceptor(data);
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

class LoopMetaInterceptor implements HookInterceptor<[models.ProcessorContext], boolean> {
  id;
  isInLoop = false;
  constructor(private readonly data: LoopMetaData) {
    this.id = `loop_${data.type}`;
  }

  async beforeLoop(hookContext: HookTriggerContext<[models.ProcessorContext], boolean>): Promise<boolean> {
    if (this.isInLoop) {
      return true;
    }
    const context = hookContext.args[0];
    const iteration = this.iterate(context);
    const responses = [];
    try {
      this.isInLoop = true;
      let next = await iteration.next();
      while (!next.done) {
        utils.report(context, `${next.value.index + 1} loop pass`);
        const loopContext = {
          ...context,
          httpRegion: this.createHttpRegionClone(context.httpRegion, next.value.index),
          variables: Object.assign(context.variables, next.value.variables),
        };
        const result = await hookContext.hook.trigger(loopContext);
        if (result === HookCancel) {
          return false;
        }
        responses.push(loopContext.variables.response);
        next = await iteration.next();
      }
      if (context.httpRegion.metaData.name) {
        utils.setVariableInContext(
          {
            [`${context.httpRegion.metaData.name}List`]: responses,
          },
          context
        );
      }
      this.breakHookLoop(hookContext);
    } finally {
      this.isInLoop = false;
    }
    return true;
  }

  private breakHookLoop(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>) {
    hookContext.index = hookContext.length;
  }
  private async *iterate(context: models.ProcessorContext) {
    switch (this.data.type) {
      case LoopMetaType.forOf:
        await (yield* this.iterateForOfLoop(context));
        break;
      case LoopMetaType.for:
        yield* this.iterateForLoop();
        break;
      case LoopMetaType.while:
        await (yield* this.iterateWhileLoop(context));
        break;
      default:
        break;
    }
  }

  private async *iterateForOfLoop(context: models.ProcessorContext) {
    if (this.data.variable && this.data.iterable) {
      const array = await io.javascriptProvider.evalExpression(this.data.iterable, context);
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
  }

  private async *iterateWhileLoop(context: models.ProcessorContext) {
    if (this.data.expression) {
      let index = 0;
      while (await io.javascriptProvider.evalExpression(this.data.expression, context)) {
        yield {
          index,
          variables: {
            $index: index,
          },
        };
        index++;
      }
    }
  }

  private *iterateForLoop() {
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
  }

  private createHttpRegionClone(httpRegion: models.HttpRegion, index: number): models.HttpRegion {
    return {
      ...httpRegion,
      metaData: {
        ...httpRegion.metaData,
        name: httpRegion.metaData.name ? `${httpRegion.metaData.name}${index}` : undefined,
      },
    };
  }
}
