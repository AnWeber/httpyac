import * as models from '../../../models';
import { parseComment } from './commentHttpRegionParser';
import { parseMetaData } from './metaHttpRegionParser';
import { MultipartMixedInterceptor } from './multipartMixedInterceptor';
import { parseOutputRedirection } from './outputRedirectionHttpRegionParser';
import { parseRequestBody } from './requestBodyHttpRegionParser';
import { parseHttpRequestLine } from './requestHttpRegionParser';
import { parseResponse } from './responseHttpRegionParser';
import { parseResponseRef } from './responseRefHttpRegionParser';
import { parseVariable } from './variableHttpRegionParser';

export function initParseHook(api: models.HttpyacHooksApi) {
  api.hooks.parse.addHook('meta', parseMetaData);
  api.hooks.parse.addHook('comment', parseComment);
  api.hooks.parse.addHook('variable', parseVariable);
  api.hooks.parse.addHook('request', parseHttpRequestLine);
  api.hooks.parse.addHook('outputRedirection', parseOutputRedirection);
  api.hooks.parse.addHook('responseRef', parseResponseRef);
  api.hooks.parse.addHook('response', parseResponse);
  api.hooks.parse.addHook('requestBody', parseRequestBody);

  api.hooks.parse.addInterceptor(new MultipartMixedInterceptor());
}
