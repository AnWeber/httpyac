import { HttpyacHooksApi } from '../../../models';
import { bailOnFailedTestInterceptor } from './bailOnFailedTestInterceptor';
import { loggerFlushInterceptor } from './loggerFlushInterceptor';
import { testExitCodeInterceptor } from './testExitCodeInterceptor';

export function createCliPluginRegister(bail: boolean) {
  return function registerCliPlugin(api: HttpyacHooksApi) {
    api.hooks.execute.addInterceptor(loggerFlushInterceptor);
    api.hooks.execute.addInterceptor(testExitCodeInterceptor);
    if (bail) {
      api.hooks.execute.addInterceptor(bailOnFailedTestInterceptor);
    }
  };
}
