import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { isString, toMultiLineString } from '../utils';


export interface GqlData{
  operationName?: string;
  query?: string | (() => Promise<string>);
  fragments: Record<string, string | (() => Promise<string>)>
}

export interface GqlPostRequest{
  query: string;
  operationName?: string;
  variables?: Record<string, unknown>
}


export class GqlAction implements HttpRegionAction {
  type = ActionType.gql;

  constructor(private readonly gqlData: GqlData) {}

  async process(context: ProcessorContext): Promise<boolean> {
    if (context.request?.body && this.gqlData?.query) {
      let query: string;
      if (isString(this.gqlData.query)) {
        query = this.gqlData.query;
      } else {
        query = await this.gqlData.query();
      }


      for (const [key, value] of Object.entries(this.gqlData.fragments)) {
        if (query.indexOf(`...${key}`) >= 0) {
          let fragment: string;
          if (isString(value)) {
            fragment = value;
          } else {
            fragment = await value();
          }
          query = toMultiLineString([query, fragment]);
        }
      }

      const gqlRequestBody: GqlPostRequest = {
        query
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
