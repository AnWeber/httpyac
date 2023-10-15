import * as models from '../../models';
import { parseGraphql } from './gqlHttpRegionParser';
import { graphqlProtocolReplacer } from './graphqlProtocolReplacer';

export function registerGraphQL(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('graphql', parseGraphql, { before: ['request'] });
  api.hooks.onRequest.addHook('graphqlProtocolReplacer', graphqlProtocolReplacer);
}
