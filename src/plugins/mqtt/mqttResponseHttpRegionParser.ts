import * as models from '../../models';
import * as utils from '../../utils';

export async function parseMQTTResponse(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  return utils.parseInlineResponse(
    getLineReader,
    context,
    /^\s*MQTT\s*(?<statusCode>([0-9]+))\s*(-)?\s*(?<statusMessage>.*)$/u
  );
}
