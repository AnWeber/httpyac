import * as models from '../../models';
import * as utils from '../../utils';

export async function parseGrpcResponse(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  return utils.parseInlineResponse(
    getLineReader,
    context,
    /^\s*GRPC\s*(?<statusCode>([0-9]+))\s*(-)?\s*(?<statusMessage>.*)$/u
  );
}
