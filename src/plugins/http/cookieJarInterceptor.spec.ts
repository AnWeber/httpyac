import { HookTriggerContext, IHook } from 'hookpoint';

import * as models from '../../models';
import { CookieJarInterceptor } from './cookieJarInterceptor';

describe('cookieJarInterceptor', () => {
  describe('cookieJarInterceptor', () => {
    it('should set cookie jar', async () => {
      const cookieJarInterceptor = new CookieJarInterceptor();
      const request = {
        protocol: 'HTTP',
        options: {
          cookieJar: undefined,
        },
      };
      const context = {
        request,
        httpRegion: {
          metaData: {},
        },
        config: {
          cookieJarEnabled: true,
        },
        httpFile: {},
        options: {},
      } as unknown as models.ProcessorContext;
      const result = await cookieJarInterceptor.beforeTrigger(getHookContext(context, 2));
      expect(result).toBeTruthy();
      expect(request.options.cookieJar).toBeDefined();
      const resultAfterTrigger = await cookieJarInterceptor.afterTrigger(getHookContext(context, 1));
      expect(resultAfterTrigger).toBeTruthy();
    });
    it('should ignore cookie jar because of config', async () => {
      const cookieJarInterceptor = new CookieJarInterceptor();
      const request = {
        protocol: 'HTTP',
        options: {
          cookieJar: undefined,
        },
      };
      const context = {
        request,
        httpRegion: {
          metaData: {},
        },
        config: {
          cookieJarEnabled: false,
        },
        httpFile: {},
        options: {},
      } as unknown as models.ProcessorContext;
      const result = await cookieJarInterceptor.beforeTrigger(getHookContext(context, 2));
      expect(result).toBeTruthy();
      expect(request.options.cookieJar).toBeUndefined();
    });
    it('should ignore cookie jar because metaData.noCookieJar', async () => {
      const cookieJarInterceptor = new CookieJarInterceptor();
      const request = {
        protocol: 'HTTP',
        options: {
          cookieJar: undefined,
        },
      };
      const context = {
        request,
        httpRegion: {
          metaData: {
            noCookieJar: true,
          },
        },
        config: {
          cookieJarEnabled: true,
        },
        httpFile: {},
        options: {},
      } as unknown as models.ProcessorContext;
      const result = await cookieJarInterceptor.beforeTrigger(getHookContext(context, 2));
      expect(result).toBeTruthy();
      expect(request.options.cookieJar).toBeUndefined();
    });
    it('should ignore amqp protocol', async () => {
      const cookieJarInterceptor = new CookieJarInterceptor();

      const request = {
        protocol: 'AMQP',
        options: {
          cookieJar: undefined,
        },
      };
      const result = await cookieJarInterceptor.beforeTrigger(getHookContext({ request }, 2));
      expect(result).toBeTruthy();
      expect(request.options.cookieJar).toBeUndefined();
    });
  });
});

function getHookContext(
  context: unknown,
  length: number
): HookTriggerContext<[models.ProcessorContext], boolean | undefined> {
  return {
    arg: context as models.ProcessorContext,
    args: [context as models.ProcessorContext],
    index: 0,
    length,
    results: [],
    hook: {} as unknown as IHook<[models.ProcessorContext], boolean | undefined, unknown>,
  };
}
