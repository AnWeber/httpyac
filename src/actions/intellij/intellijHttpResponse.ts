import { HttpResponse } from '../../models';
import { isString } from '../../utils';
import {
  HttpResponse as JetbrainsHttpResponse,
  ContentType as JetbrainsContentType,
  ResponseHeaders as JetbrainsResponseHeaders,
} from './http-client';

export class IntellijHttpResponse implements JetbrainsHttpResponse {
  body: unknown;
  status: number;
  contentType: JetbrainsContentType;
  headers: JetbrainsResponseHeaders;

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

export class IntellijHeaders implements JetbrainsResponseHeaders {
  constructor(private readonly headers: Record<string, unknown> | undefined) {}

  valueOf(headerName: string): string | null {
    if (this.headers) {
      const obj = this.headers[headerName];
      if (obj && isString(obj)) {
        return obj;
      }
    }
    return null;
  }
  valuesOf(headerName: string): string[] {
    if (this.headers) {
      const obj = this.headers[headerName];
      if (obj && Array.isArray(obj)) {
        return obj;
      }
    }
    return [];
  }
}
