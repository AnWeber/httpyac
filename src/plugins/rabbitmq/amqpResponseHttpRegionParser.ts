import * as models from '../../models';
import * as utils from '../../utils';

export async function parseAmqpResponse(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  return utils.parseInlineResponse(
    getLineReader,
    context,
    /^\s*AMQP\s*(?<statusCode>(-1|0))\s*(-)?\s*(?<statusMessage>.*)$/u
  );
}
