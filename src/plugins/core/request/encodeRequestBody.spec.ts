import { encodeRequestBody } from './encodeRequestBody';
import { Request } from '../../../models';
describe('encodeRequestBody', () => {
  it('encodeRequestBody should return encoded string', () => {
    const request = {
      body: 'a b',
      contentType: {
        mimeType: 'application/x-www-form-urlencoded',
      },
    } as Request;
    encodeRequestBody(request);
    expect(request.body).toBe('a%20b');
  });
  it('encodeRequestBody should not transform if not valid mimeType', () => {
    const request = {
      body: 'a b',
    } as Request;
    encodeRequestBody(request);
    expect(request.body).toBe('a b');
  });
  it('encodeRequestBody should not transform if is buffer', () => {
    const request = {
      body: Buffer.from('a b'),
    } as Request;
    encodeRequestBody(request);
    expect(request.body).toBeInstanceOf(Buffer);
  });
});
