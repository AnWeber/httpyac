import { HttpyacHooksApi } from '../../../models';
import { DefaultMetaDataHandler } from './defaultMetaDataHandler';
import { importMetaDataHandler } from './importMetaDataHandler';
import { jwtMetaDataHandler } from './jwtMetaDataHandler';
import { keepStreamingMetaDataHandler } from './keepStreamingMetaDataHandler';
import { loopMetaDataHandler } from './loopMetaDataHandler';
import { noRedirectMetaDataHandler } from './noRedirectMetaDataHandler';
import { noRejectUnauthorizedMetaDataHandler } from './noRejectUnauthorizedMetaDataHandler';
import { noteMetaDataHandler } from './noteMetaDataHandler';
import { proxyMetaDataHandler } from './proxyMetaDataHandler';
import { rateLimitMetaDataHandler } from './rateLimitMetaDataHandler';
import { refMetaDataHandler } from './refMetaDataHandler';
import { responseRefMetaDataHandler } from './responseRefMetaDataHandler';
import { sleepMetaDataHandler } from './sleepMetaDataHandler';
import { verboseMetaDataHandler } from './verboseMetaDataHandler';

export function initParseMetData(api: HttpyacHooksApi) {
  api.hooks.parseMetaData.addHook('import', importMetaDataHandler);
  api.hooks.parseMetaData.addHook('jwt', jwtMetaDataHandler);
  api.hooks.parseMetaData.addHook('keepStreaming', keepStreamingMetaDataHandler);
  api.hooks.parseMetaData.addHook('loop', loopMetaDataHandler);
  api.hooks.parseMetaData.addHook('noRedirect', noRedirectMetaDataHandler);
  api.hooks.parseMetaData.addHook('noRejectUnauthorized', noRejectUnauthorizedMetaDataHandler);
  api.hooks.parseMetaData.addHook('note', noteMetaDataHandler);
  api.hooks.parseMetaData.addHook('proxy', proxyMetaDataHandler);
  api.hooks.parseMetaData.addHook('rateLimit', rateLimitMetaDataHandler);
  api.hooks.parseMetaData.addHook('ref', refMetaDataHandler);
  api.hooks.parseMetaData.addHook('responseRef', responseRefMetaDataHandler);
  api.hooks.parseMetaData.addHook('sleep', sleepMetaDataHandler);
  api.hooks.parseMetaData.addHook('verbose', verboseMetaDataHandler);

  api.hooks.parseMetaData.addInterceptor(new DefaultMetaDataHandler());
}
