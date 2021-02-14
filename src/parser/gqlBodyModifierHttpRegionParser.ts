
import { HttpRegionParser, HttpRegionParserResult, ParserContext } from '../models';
import { isString, isMimeTypeJSON } from '../utils';

export const GQL_IDENTIFIER = 'gql';



export interface GqlData{
  operationName?: string;
  body?: string;
  fragments: Record<string, string>
}

export interface GqlPostRequest{
  query: string;
  operationName?: string;
  variables?: Record<string, any>
}

export class GqlBodyModifierHttpRegionParser implements HttpRegionParser{
  async parse(): Promise<HttpRegionParserResult> {
    return false;
  }

  close(context: ParserContext): void{
    const gqlData: GqlData = context.data[GQL_IDENTIFIER];
    if (gqlData && gqlData.body) {
      const gqlRequestBody: GqlPostRequest = {
        query: gqlData.body
      };
      if (gqlData.operationName) {
        gqlRequestBody.operationName = gqlData.operationName;
      }
      delete gqlData.operationName;
      delete gqlData.body;
      if (context.httpRegion.request && isMimeTypeJSON(context.httpRegion.request.contentType)) {
        if (isString(context.httpRegion.request.body)) {
          gqlRequestBody.variables = JSON.parse(context.httpRegion.request.body);
        }
        context.httpRegion.request.body = JSON.stringify(gqlRequestBody);
      }
    }
  }
}
