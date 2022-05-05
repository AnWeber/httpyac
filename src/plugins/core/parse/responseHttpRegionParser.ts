import * as models from '../../../models';
import * as utils from '../../../utils';

export async function parseResponse(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  return utils.parseInlineResponse(
    getLineReader,
    context,
    /^\s*HTTP\/(?<httpVersion>\S+)\s*(?<statusCode>[1-5][0-9][0-9])\s*(-)?\s*(?<statusMessage>.*)$/u
  );
}
