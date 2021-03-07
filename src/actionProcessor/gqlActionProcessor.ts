import { ProcessorContext } from '../models';
import { isString } from '../utils';


export interface GqlData{
  operationName?: string;
  query?: string;
  fragments: Record<string, string>
}

export interface GqlPostRequest{
  query: string;
  operationName?: string;
  variables?: Record<string, any>
}

export async function gqlActionProcessor(gqlData: GqlData, context: ProcessorContext) {
  if (context.request?.body && gqlData?.query) {
    const gqlRequestBody: GqlPostRequest = {
      query: gqlData.query
    };
    if (gqlData.operationName) {
      gqlRequestBody.operationName = gqlData.operationName;
    }
    if (isString(context.request.body)) {
      gqlRequestBody.variables = JSON.parse(context.request.body);
    }
    context.request.body = JSON.stringify(gqlRequestBody);
  }
  return true;
}