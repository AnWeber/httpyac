import { LoopMetaAction, LoopMetaType, LoopMetaData } from '../../actions';
import * as models from '../../models';
import { ParserRegex } from '../parserRegex';

export function loopMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext): boolean {
  if (type === 'loop' && value) {
    const forOfMatch = ParserRegex.meta.forOf.exec(value);
    if (forOfMatch?.groups?.iterable && forOfMatch?.groups?.variable) {
      addHook(context, {
        type: LoopMetaType.forOf,
        variable: forOfMatch.groups.variable,
        iterable: forOfMatch.groups.iterable,
      });
      return true;
    }
    const forMatch = ParserRegex.meta.for.exec(value);
    if (forMatch?.groups?.counter) {
      addHook(context, {
        type: LoopMetaType.for,
        counter: Number.parseInt(forMatch.groups.counter, 10),
      });
      return true;
    }
    const whileMatch = ParserRegex.meta.while.exec(value);
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
