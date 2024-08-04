import './completionItemProvider';

import * as models from '../../models';
import { parseAssertLine } from './assertHttpRegionParser';
import { provideAssertValueDuration } from './provideAssertValueDuration';
import { provideAssertValueHeader } from './provideAssertValueHeader';
import { provideAssertValueJavascript } from './provideAssertValueJavascript';
import { provideAssertValueStatus } from './provideAssertValueStatus';
import { TestFailedInterceptor } from './testFailedInterceptor';

export function registerAssertPlugin(api: models.HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(new TestFailedInterceptor());
  api.hooks.provideAssertValue.addHook('status', provideAssertValueStatus, { before: ['request'] });
  api.hooks.provideAssertValue.addHook('header', provideAssertValueHeader, { before: ['request'] });
  api.hooks.provideAssertValue.addHook('javascript', provideAssertValueJavascript, { before: ['request'] });
  api.hooks.provideAssertValue.addHook('duration', provideAssertValueDuration, { before: ['request'] });
  api.hooks.parse.addHook('assert', parseAssertLine, { before: ['request'] });
}
