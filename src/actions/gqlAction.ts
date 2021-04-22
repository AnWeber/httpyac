import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { isString } from '../utils';


export interface GqlData{
  operationName?: string;
  query?: string;
  fragments: Record<string, string>
}

export interface GqlPostRequest{
  query: string;
  operationName?: string;
  variables?: Record<string, unknown>
}


export class GqlAction implements HttpRegionAction {
  type = ActionType.gql;

  constructor(private readonly gqlData: GqlData){}

  async process(context: ProcessorContext): Promise<boolean> {
    if (context.request?.body && this.gqlData?.query) {
      const gqlRequestBody: GqlPostRequest = {
        query: this.gqlData.query
      };
      if (this.gqlData.operationName) {
        gqlRequestBody.operationName = this.gqlData.operationName;
      }
      if (isString(context.request.body)) {
        gqlRequestBody.variables = JSON.parse(context.request.body);
      }
      context.request.body = JSON.stringify(gqlRequestBody);
    }
    return true;
  }
}