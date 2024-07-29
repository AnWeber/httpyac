import * as models from '../../../models';
import { setDefaultHttpyacHeaders } from './setDefaultHttpyacHeaders';

describe('setDefaultHttpyacHeaders', () => {
  describe('attachDefaultHeaders', () => {
    it('set request headers if no headers are specified', async () => {
      const request: models.Request = { url: 'foo' };
      await setDefaultHttpyacHeaders(request);
      expect(request.headers).toEqual({
        Accept: '*/*',
        'User-Agent': 'httpyac',
      });
    });
    it('set request headers if other headers are specified', async () => {
      const request: models.Request = { url: 'foo', headers: { foo: 'bar' } };
      await setDefaultHttpyacHeaders(request);
      expect(request.headers).toEqual({
        Accept: '*/*',
        'User-Agent': 'httpyac',
        foo: 'bar',
      });
    });

    it('should not set request headers if headers are specified', async () => {
      const request: models.Request = { url: 'foo', headers: { 'user-agent': 'bar', accept: 'application/json' } };
      await setDefaultHttpyacHeaders(request);
      expect(request.headers).toEqual({
        'user-agent': 'bar',
        accept: 'application/json',
      });
    });
  });
});
