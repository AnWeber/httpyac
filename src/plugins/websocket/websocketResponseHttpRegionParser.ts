import * as models from '../../models';
import * as utils from '../../utils';

export async function parseWebSocketResponse(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  return utils.parseInlineResponse(
    getLineReader,
    context,
    /^\s*WS\s*(?<statusCode>([0-9]{4}|0))\s*(-)?\s*(?<statusMessage>.*)$/u
  );
}
