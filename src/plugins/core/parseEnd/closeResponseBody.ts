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
      const symbol = context.data.httpResponseSymbol.symbol;
      if (symbol.children) {
        const lastLine = context.data.httpResponseSymbol.body.at(-1);
        symbol.children.push(
          new models.HttpSymbol({
            name: 'response body',
            description: 'response body',
            kind: models.HttpSymbolKind.response,
            startLine: symbol.endLine - context.data.httpResponseSymbol.body.length + 1,
            startOffset: 0,
            endLine: symbol.endLine,
            endOffset: lastLine?.length || 0,
          })
        );
      }
    }

    delete context.data.httpResponseSymbol;
  }
}
