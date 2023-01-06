import * as models from '../../../models';
import { isString, getHeader } from '../../../utils';
import { HttpResponse, ContentType, ResponseHeaders } from './http-client';

export class IntellijHttpResponse implements HttpResponse {
  body: unknown;
  status: number;
  contentType: ContentType;
  headers: ResponseHeaders;

  constructor(response: models.HttpResponse) {
    this.body = response.parsedBody || response.body;
    this.status = response.statusCode;
    this.contentType = {
      mimeType: response.contentType?.mimeType || 'application/octet-stream',
      charset: response.contentType?.charset || 'utf-8',
    };
    this.headers = new IntellijHeaders(response.headers);
  }
}

export class IntellijHeaders implements ResponseHeaders {
  constructor(private readonly headers: Record<string, unknown> | undefined) {}

  valueOf(headerName: string): string | null {
    if (this.headers) {
      const obj = getHeader(this.headers, headerName);
      if (obj && isString(obj)) {
        return obj;
      }
    }
    return null;
  }
  valuesOf(headerName: string): string[] {
    if (this.headers) {
      const obj = getHeader(this.headers, headerName);
      if (obj) {
        if (isString(obj)) {
          return [obj];
        }
        if (Array.isArray(obj)) {
          return obj;
        }
      }
    }
    return [];
  }
}
