import * as models from '../../../models';
import { setEnvRequestOptions } from './setEnvRequestOptions';

describe('setEnvRequestOptions', () => {
  describe('setEnvRequestOptions', () => {
    it('should set rejectUnauthorized=false', async () => {
      const request: models.Request = { protocol: 'HTTP', url: 'url' };
      await setEnvRequestOptions(request, {
        variables: { request_rejectUnauthorized: false },
      } as unknown as models.ProcessorContext);
      expect(request.noRejectUnauthorized).toEqual(true);
    });
    it('should set rejectUnauthorized=false', async () => {
      const request: models.Request = { protocol: 'HTTP', url: 'url' };
      await setEnvRequestOptions(request, {
        variables: { request_rejectUnauthorized: 'false' },
      } as unknown as models.ProcessorContext);
      expect(request.noRejectUnauthorized).toEqual(true);
    });
    it('should set rejectUnauthorized=true', async () => {
      const request: models.Request = { protocol: 'HTTP', url: 'url' };
      await setEnvRequestOptions(request, {
        variables: { request_rejectUnauthorized: 'true' },
      } as unknown as models.ProcessorContext);
      expect(request.noRejectUnauthorized).toEqual(false);
    });
    it('should ignore rejectUnauthorized', async () => {
      const request: models.Request = { protocol: 'HTTP', url: 'url' };
      await setEnvRequestOptions(request, {
        variables: {},
      } as unknown as models.ProcessorContext);
      expect(request.noRejectUnauthorized).toBeUndefined();
    });
    it('should set proxy', async () => {
      const request: models.Request = { protocol: 'HTTP', url: 'url' };
      await setEnvRequestOptions(request, {
        variables: {
          request_proxy: 'http://localhost:8080',
        },
      } as unknown as models.ProcessorContext);
      expect(request.proxy).toBe('http://localhost:8080');
    });
    it('should set proxy', async () => {
      const request: models.Request = { protocol: 'HTTP', url: 'url' };
      await setEnvRequestOptions(request, {
        variables: {
          request_proxy: 'http://localhost:8080',
        },
      } as unknown as models.ProcessorContext);
      expect(request.proxy).toBe('http://localhost:8080');
    });
    it('should set timeout', async () => {
      const request: models.Request = { protocol: 'HTTP', url: 'url' };
      await setEnvRequestOptions(request, {
        variables: {
          request_timeout: '500',
        },
      } as unknown as models.ProcessorContext);
      expect(request.timeout).toBe(500);
    });
  });
});
