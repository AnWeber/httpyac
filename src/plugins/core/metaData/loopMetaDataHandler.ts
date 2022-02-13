import { LoopMetaAction, LoopMetaType, LoopMetaData } from '../../../actions';
import * as models from '../../../models';

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
