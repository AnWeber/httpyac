import { LoopMetaAction, LoopMetaType } from '../../actions';
import * as models from '../../models';
import { ParserRegex } from '../parserRegex';

export function loopMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext): boolean {
  if (type === 'loop' && value) {
    const forOfMatch = ParserRegex.meta.forOf.exec(value);
    if (forOfMatch?.groups?.iterable && forOfMatch?.groups?.variable) {
      context.httpRegion.hooks.execute.addInterceptor(
        new LoopMetaAction({
          type: LoopMetaType.forOf,
          variable: forOfMatch.groups.variable,
          iterable: forOfMatch.groups.iterable,
        })
      );
      return true;
    }
    const forMatch = ParserRegex.meta.for.exec(value);
    if (forMatch?.groups?.counter) {
      context.httpRegion.hooks.execute.addInterceptor(
        new LoopMetaAction({
          type: LoopMetaType.for,
          counter: Number.parseInt(forMatch.groups.counter, 10),
        })
      );
      return true;
    }
    const whileMatch = ParserRegex.meta.while.exec(value);
    if (whileMatch?.groups?.expression) {
      context.httpRegion.hooks.execute.addInterceptor(
        new LoopMetaAction({
          type: LoopMetaType.while,
          expression: whileMatch.groups.expression,
        })
      );
      return true;
    }
  }
  return false;
}
