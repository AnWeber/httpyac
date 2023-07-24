import * as models from '../../../models';

export function forceRegionDelimiterMetaDataHandler(
  type: string,
  _value: string | undefined,
  context: models.ParserContext
) {
  if (type === 'forceRegionDelimiter') {
    context.forceRegionDelimiter = true;
  }
  return false;
}
