import * as models from '../../models';
import { parseGraphql } from './gqlHttpRegionParser';

export function registerGraphQL(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('graphql', parseGraphql, { before: ['request'] });
}
