import * as models from '../../../models';
import { attachDefaultHeaders } from './attachDefaultHeaders';

describe('attachDefaultHeaders', () => {
  describe('attachDefaultHeaders', () => {
    it('set request headers if no headers are specified', async () => {
      const request: models.Request = {};
      await attachDefaultHeaders(request, {
        config: {
          defaultHeaders: {
            foo: 'bar',
          },
        },
      } as unknown as models.ProcessorContext);
      expect(request.headers?.foo).toEqual('bar');
    });
    it('add request headers to defined request headers', async () => {
      const request: models.Request = { headers: { bar: 'foo' } };
      await attachDefaultHeaders(request, {
        config: {
          defaultHeaders: {
            foo: 'bar',
          },
        },
      } as unknown as models.ProcessorContext);
      expect(request.headers?.foo).toEqual('bar');
      expect(request.headers?.bar).toEqual('foo');
    });
    it('do not override existing headers', async () => {
      const request: models.Request = { headers: { foo: 'foo' } };
      await attachDefaultHeaders(request, {
        config: {
          defaultHeaders: {
            foo: 'bar',
          },
        },
      } as unknown as models.ProcessorContext);
      expect(request.headers?.foo).toEqual('foo');
    });
  });
});
