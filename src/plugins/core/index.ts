import * as models from '../../models';
import { initProvideEnvironmentsHook } from './environments';
import { initExecuteInterceptor } from './execute';
import { initParseMetData } from './metaData';
import { initParseHook } from './parse';
import { initParseEndHook } from './parseEnd';
import { initReplaceVariableHook } from './replacer';
import { initOnRequestHook } from './request';
import { initOnResponseHook } from './response';

export function registerCorePlugins(api: models.HttpyacHooksApi) {
  initOnRequestHook(api);
  initOnResponseHook(api);
  initParseHook(api);
  initExecuteInterceptor(api);
  initParseMetData(api);
  initParseEndHook(api);

  initProvideEnvironmentsHook(api);
  initReplaceVariableHook(api);
}
