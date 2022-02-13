import { ParseMetaDataHook } from '../../../models';
import { defaultMetaDataHandler } from './defaultMetaDataHandler';
import { importMetaDataHandler } from './importMetaDataHandler';
import { keepStreamingMetaDataHandler } from './keepStreamingMetaDataHandler';
import { loopMetaDataHandler } from './loopMetaDataHandler';
import { noteMetaDataHandler } from './noteMetaDataHandler';
import { rateLimitMetaDataHandler } from './rateLimitMetaDataHandler';
import { refMetaDataHandler } from './refMetaDataHandler';
import { responseRefMetaDataHandler } from './responseRefMetaDataHandler';
import { sleepMetaDataHandler } from './sleepMetaDataHandler';
import { verboseMetaDataHandler } from './verboseMetaDataHandler';

export function initParseMetData(hook: ParseMetaDataHook) {
  hook.addHook('note', noteMetaDataHandler);
  hook.addHook('import', importMetaDataHandler);
  hook.addHook('keepStreaming', keepStreamingMetaDataHandler);
  hook.addHook('loop', loopMetaDataHandler);
  hook.addHook('rateLimit', rateLimitMetaDataHandler);
  hook.addHook('ref', refMetaDataHandler);
  hook.addHook('responseRef', responseRefMetaDataHandler);
  hook.addHook('sleep', sleepMetaDataHandler);
  hook.addHook('verbose', verboseMetaDataHandler);
  hook.addHook('default', defaultMetaDataHandler);
}
