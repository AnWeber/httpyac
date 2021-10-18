import * as models from '../../models';

export function defaultMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  context.httpRegion.metaData = Object.assign(context.httpRegion.metaData || {}, {
    [type]: value || true,
  });
  return true;
}
