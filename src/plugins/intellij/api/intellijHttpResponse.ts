import { HttpResponse } from '../../../models';
import { isString, getHeader } from '../../../utils';
import {
  HttpResponse as JetBrainsHttpResponse,
  ContentType as JetBrainsContentType,
  ResponseHeaders as JetBrainsResponseHeaders,
} from './http-client';

export class IntellijHttpResponse implements JetBrainsHttpResponse {
  body: unknown;
  status: number;
  contentType: JetBrainsContentType;
  headers: JetBrainsResponseHeaders;

  constructor(response: HttpResponse) {
    this.body = response.parsedBody || response.body;
    this.status = response.statusCode;
    this.contentType = {
      mimeType: response.contentType?.mimeType || 'application/octet-stream',
      charset: response.contentType?.charset || 'utf-8',
    };
    this.headers = new IntellijHeaders(response.headers);
  }
}

export class IntellijHeaders implements JetBrainsResponseHeaders {
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
