import { transformMultilineFormUrlEncoded } from './transformMultilineFormUrlEncoded';
import { Request } from '../../../models';
describe('transformMultilineFormUrlEncoded', () => {
  it('transformMultilineFormUrlEncoded should return joined string', () => {
    const request = {
      body: 'foo = a&\nbar = b',
      contentType: {
        mimeType: 'application/x-www-form-urlencoded',
      },
    } as Request;
    transformMultilineFormUrlEncoded(request);
    expect(request.body).toBe('foo=a&bar=b');
  });

  it('transformMultilineFormUrlEncoded should return without whitespace around &', () => {
    const request = {
      body: 'foo = a & bar = b',
      contentType: {
        mimeType: 'application/x-www-form-urlencoded',
      },
    } as Request;
    transformMultilineFormUrlEncoded(request);
    expect(request.body).toBe('foo=a&bar=b');
  });
  it('transformMultilineFormUrlEncoded should ignore whitespace in content', () => {
    const request = {
      body: 'foo = a & bar = bl a',
      contentType: {
        mimeType: 'application/x-www-form-urlencoded',
      },
    } as Request;
    transformMultilineFormUrlEncoded(request);
    expect(request.body).toBe('foo=a&bar=bl a');
  });
  it('transformMultilineFormUrlEncoded should ignore content on wrong mimetype', () => {
    const request = {
      body: 'foo = a&\nbar = b',
    } as Request;
    transformMultilineFormUrlEncoded(request);
    expect(request.body).toBe('foo = a&\nbar = b');
  });
});
