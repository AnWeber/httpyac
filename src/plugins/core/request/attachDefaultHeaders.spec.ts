import * as models from '../../../models';
import { getHeader } from '../../../utils';
import { attachDefaultHeaders } from './attachDefaultHeaders';

describe('attachDefaultHeaders', () => {
  describe('attachDefaultHeaders', () => {
    it('set request headers if no headers are specified', async () => {
      const request: models.Request = { url: 'foo' };
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
      const request: models.Request = { url: 'foo', headers: { bar: 'foo' } };
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
      const request: models.Request = { url: 'foo', headers: { foo: 'foo' } };
      await attachDefaultHeaders(request, {
        config: {
          defaultHeaders: {
            foo: 'bar',
          },
        },
      } as unknown as models.ProcessorContext);
      expect(request.headers?.foo).toEqual('foo');
    });
    it('do not override existing headers ignoring casing', async () => {
      const request: models.Request = { url: 'foo', headers: { Foo: 'foo' } };
      await attachDefaultHeaders(request, {
        config: {
          defaultHeaders: {
            foo: 'bar',
          },
        },
      } as unknown as models.ProcessorContext);
      expect(getHeader(request.headers, 'foo')).toEqual('foo');
    });
  });
});
