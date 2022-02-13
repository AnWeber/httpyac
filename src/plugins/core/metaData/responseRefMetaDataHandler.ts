import * as models from '../../../models';

export function responseRefMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'responseRef' && value) {
    if (!context.httpRegion.responseRefs) {
      context.httpRegion.responseRefs = [];
    }
    context.httpRegion.responseRefs.push(value);
  }
  return false;
}
