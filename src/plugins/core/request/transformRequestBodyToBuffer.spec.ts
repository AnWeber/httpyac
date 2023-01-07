import * as models from '../../../models';
import { transformRequestBodyToBuffer } from './transformRequestBodyToBuffer';

describe('transformRequestBodyToBuffer', () => {
  it('should return same string', async () => {
    const request: models.Request = { body: 'foo' };
    await transformRequestBodyToBuffer(request);
    expect(request.body).toEqual('foo');
  });
  it('should return merged buffer', async () => {
    const request: models.Request = {
      body: [() => Promise.resolve(Buffer.from('foo')), 'bar'],
    };
    await transformRequestBodyToBuffer(request);
    expect(Buffer.isBuffer(request.body)).toBeTruthy();
    if (Buffer.isBuffer(request.body)) {
      expect(request.body.toString('utf-8')).toBe('foobar');
    }
  });
  it('should return merged string', async () => {
    const request: models.Request = {
      body: ['foo', 'bar'],
    };
    await transformRequestBodyToBuffer(request);
    expect(Buffer.isBuffer(request.body)).toBeTruthy();
    if (Buffer.isBuffer(request.body)) {
      expect(request.body.toString('utf-8')).toBe('foobar');
    }
  });
});
