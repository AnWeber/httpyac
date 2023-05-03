import * as models from '../../../models';
import { addMulitpartformBoundary } from './addMulitpartformBoundary';

describe('addMulitpartformBoundary', () => {
  it('should return body with Boundary', async () => {
    const request: models.Request = {
      url: 'foo',
      body: 'foo',
      contentType: {
        contentType: 'multipart/form-data; boundary=Boundary',
        mimeType: 'multipart/form-data',
      },
    };
    await addMulitpartformBoundary(request);
    expect(request.body).toBe('foo\r\n--Boundary--');
  });
  it('should return body string array with Boundary', async () => {
    const request: models.Request = {
      url: 'foo',
      body: ['foo', '\r\nbar'],
      contentType: {
        contentType: 'multipart/form-data; boundary=Boundary',
        mimeType: 'multipart/form-data',
      },
    };
    await addMulitpartformBoundary(request);
    expect(request.body).toEqual(['foo', '\r\nbar\r\n--Boundary--']);
  });
  it('should return body array with Boundary', async () => {
    const body = ['foo', async () => 'foo'];
    const request: models.Request = {
      url: 'foo',
      body,
      contentType: {
        contentType: 'multipart/form-data; boundary=Boundary',
        mimeType: 'multipart/form-data',
      },
    };
    await addMulitpartformBoundary(request);
    Array.isArray(request.body);
    expect(body.pop()).toBe('\r\n--Boundary--');
  });
  it('should return unmodified body', async () => {
    const request: models.Request = {
      url: 'foo',
      body: 'bar\r\n--Boundary--',
    };
    await addMulitpartformBoundary(request);
    expect(request.body).toBe('bar\r\n--Boundary--');
  });
  it('should return unmodified body with whitespace', async () => {
    const request: models.Request = {
      url: 'foo',
      body: 'bar\r\n--Boundary--    ',
    };
    await addMulitpartformBoundary(request);
    expect(request.body).toBe('bar\r\n--Boundary--    ');
  });
});
