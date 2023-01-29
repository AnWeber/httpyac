import * as models from '../../models';
import * as utils from '../../utils';

export async function parseKafkaResponse(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  return utils.parseInlineResponse(
    getLineReader,
    context,
    /^\s*KAFKA\s*(?<statusCode>(1|0))\s*(-)?\s*(?<statusMessage>.*)$/u
  );
}
