import { log, userInteractionProvider } from '../io';
import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import * as utils from '../utils';

export type GqlLoadData = string | ((context: ProcessorContext) => Promise<string | undefined>);

export interface GqlData {
  operationName?: string;
  query?: GqlLoadData;
  fragments: Record<string, GqlLoadData>;
}

export interface GqlPostRequest {
  query: string;
  operationName?: string;
  variables?: Record<string, unknown>;
}

export class GqlAction implements HttpRegionAction {
  id = ActionType.gql;
  before = [ActionType.httpClient];

  constructor(private readonly gqlData: GqlData) {}

  async process(context: ProcessorContext): Promise<boolean> {
    if (context.request && this.gqlData?.query) {
      utils.report(context, 'build GraphQL query');
      let query: string | undefined;
      if (utils.isString(this.gqlData.query)) {
        query = this.gqlData.query;
      } else {
        const result = await this.gqlData.query(context);
        if (result) {
          query = result;
        } else {
          const message = 'query import not found';
          userInteractionProvider.showWarnMessage?.(message);
          log.warn(message);
        }
      }

      if (query) {
        for (const [key, value] of Object.entries(this.gqlData.fragments)) {
          if (query.indexOf(`...${key}`) >= 0) {
            let fragment: string | undefined;
            if (utils.isString(value)) {
              fragment = value;
            } else {
              const result = await value(context);
              if (result) {
                fragment = result;
              } else {
                const message = `query fragment ${key} not found`;
                userInteractionProvider.showWarnMessage?.(message);
                log.warn(message);
              }
            }
            if (fragment) {
              query = utils.toMultiLineString([query, fragment]);
            }
          }
        }
        const gqlRequestBody: GqlPostRequest = {
          query,
        };
        if (this.gqlData.operationName) {
          gqlRequestBody.operationName = this.gqlData.operationName;
        }
        if (utils.isString(context.request.body)) {
          gqlRequestBody.variables = JSON.parse(context.request.body);
        }
        context.request.body = JSON.stringify(gqlRequestBody);
      }
    }
    return true;
  }
}
