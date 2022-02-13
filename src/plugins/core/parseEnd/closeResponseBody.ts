import * as models from '../../../models';
import * as utils from '../../../utils';

export async function closeResponseBody(context: models.ParserContext): Promise<void> {
  if (context.data.httpResponseSymbol) {
    if (context.httpRegion.response && context.data.httpResponseSymbol.body.length > 0) {
      const response = context.httpRegion.response;
      const body = utils.toMultiLineString(context.data.httpResponseSymbol.body);
      response.body = body;
      response.rawBody = Buffer.from(body);
      if (response.headers) {
        response.contentType = utils.parseContentType(response.headers);
      }
      utils.setAdditionalResponseBody(response);
    }

    delete context.data.httpResponseSymbol;
  }
}
