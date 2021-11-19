import { log } from '../../io';
import * as models from '../../models';

export function verboseMetaDataHandler(type: string, _value: string | undefined, context: models.ParserContext) {
  if (type === 'verbose' || type === 'debug') {
    const level = type === 'debug' ? models.LogLevel.debug : models.LogLevel.trace;
    log.options.level = level;
    context.httpRegion.hooks.execute.addInterceptor({
      async beforeLoop() {
        log.options.level = level;
        return true;
      },
    });
    return true;
  }
  return false;
}
