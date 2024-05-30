import { transfromMultilineFormUrlEncoded } from './transfromMultilineFormUrlEncoded';
import { Request } from '../../../models';
describe('transfromMultilineFormUrlEncoded', () => {
  it('transfromMultilineFormUrlEncoded should return joined string', () => {
    const request = {
      body: 'foo = a&\nbar = b',
      contentType: {
        mimeType: 'application/x-www-form-urlencoded',
      },
    } as Request;
    transfromMultilineFormUrlEncoded(request);
    expect(request.body).toBe('foo=a&bar=b');
  });
  it('transfromMultilineFormUrlEncoded should ignore content on wrong mimetype', () => {
    const request = {
      body: 'foo = a&\nbar = b',
    } as Request;
    transfromMultilineFormUrlEncoded(request);
    expect(request.body).toBe('foo = a&\nbar = b');
  });
});
