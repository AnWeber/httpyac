import * as models from '../../models';
import * as utils from '../../utils';

export async function closeHttpRegion(parserContext: models.ParserContext): Promise<void> {
  await parserContext.httpFile.hooks.parseEndRegion.trigger(parserContext);

  const { httpRegion } = parserContext;
  parserContext.httpRegion.symbol.name = utils.getDisplayName(httpRegion);
  parserContext.httpRegion.symbol.description = utils.getRegionDescription(httpRegion);
  parserContext.httpFile.httpRegions.push(parserContext.httpRegion);
  delete parserContext.forceRegionDelimiter;
}
