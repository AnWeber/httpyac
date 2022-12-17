import * as models from '../../../models';
import { transformRequestBody } from './transformRequestBodyAction';

describe('transformRequestBodyAction', () => {
  describe('transformRequestBodyAction', () => {
    it('should return same string', async () => {
      const request: models.Request = { body: 'foo' };
      await transformRequestBody(request);
      expect(request.body).toEqual('foo');
    });
    it('should return mimetype encoded string', async () => {
      const request: models.Request = {
        body: '%foo',
        contentType: {
          mimeType: 'application/x-www-form-urlencoded',
          contentType: 'application/x-www-form-urlencoded',
        },
      };
      await transformRequestBody(request);
      expect(request.body).toEqual('%25foo');
    });
    it('should return merged buffer', async () => {
      const request: models.Request = {
        body: [() => Promise.resolve(Buffer.from('foo')), 'bar'],
      };
      await transformRequestBody(request);
      expect(Buffer.isBuffer(request.body)).toBeTruthy();
      if (Buffer.isBuffer(request.body)) {
        expect(request.body.toString('utf-8')).toBe('foobar');
      }
    });
    it('should return merged string', async () => {
      const request: models.Request = {
        body: ['foo', 'bar'],
      };
      await transformRequestBody(request);
      expect(Buffer.isBuffer(request.body)).toBeTruthy();
      if (Buffer.isBuffer(request.body)) {
        expect(request.body.toString('utf-8')).toBe('foobar');
      }
    });
  });
});
