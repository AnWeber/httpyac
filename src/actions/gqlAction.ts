import { log, PathLike } from '../io';
import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { isString, toMultiLineString } from '../utils';


export interface GqlData{
  operationName?: string;
  query?: string | ((httpFileName: PathLike) => Promise<string | false>);
  fragments: Record<string, string | ((httpFileName: PathLike) => Promise<string | false>)>
}

export interface GqlPostRequest{
  query: string;
  operationName?: string;
  variables?: Record<string, unknown>
}


export class GqlAction implements HttpRegionAction {
  id = ActionType.gql;
  after = ActionType.requestBodyImport;

  constructor(private readonly gqlData: GqlData) {}

  async process(context: ProcessorContext): Promise<boolean> {
    if (context.request?.body && this.gqlData?.query) {
      let query: string | undefined;
      if (isString(this.gqlData.query)) {
        query = this.gqlData.query;
      } else {
        const result = await this.gqlData.query(context.httpFile.fileName);
        if (result) {
          query = result;
        } else {
          log.warn('query import not found');
        }
      }

      if (query) {
        for (const [key, value] of Object.entries(this.gqlData.fragments)) {
          if (query.indexOf(`...${key}`) >= 0) {
            let fragment: string | undefined;
            if (isString(value)) {
              fragment = value;
            } else {
              const result = await value(context.httpFile.fileName);
              if (result) {
                fragment = result;
              } else {
                log.warn(`query fragment ${key} not found`);
              }
            }
            if (fragment) {
              query = toMultiLineString([query, fragment]);
            }
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
    }
    return true;
  }
}
