import { log, userInteractionProvider } from '../../io';
import { ProcessorContext, Request, VariableType } from '../../models';
import * as utils from '../../utils';

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

export class GqlAction {
  id = 'gql';
  before = ['http'];

  constructor(private readonly gqlData: GqlData) {}

  async process(request: Request, context: ProcessorContext): Promise<void> {
    if (request && this.gqlData?.query) {
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
        const replacedQuery = await utils.replaceVariables(query, VariableType.body, context);
        const gqlRequestBody: GqlPostRequest = {
          query: utils.isString(replacedQuery) ? replacedQuery : query,
        };
        if (this.gqlData.operationName) {
          gqlRequestBody.operationName = this.gqlData.operationName;
        }
        if (utils.isString(request.body)) {
          gqlRequestBody.variables = JSON.parse(request.body);
        }
        request.body = utils.stringifySafe(gqlRequestBody);
      }
    }
  }
}
