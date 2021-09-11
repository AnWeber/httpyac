import { HttpResponse, Request } from '../models';
import { isString, toMultiLineString } from './stringUtils';

export function toHttpString(response: HttpResponse) : string {
  const result: Array<string> = [];

  if (response.request) {
    result.push(...toHttpStringRequest(response.request));
    result.push('');
  }
  result.push(...toHttpStringResponse(response));

  return toMultiLineString(result);
}

export function toHttpStringResponse(response: HttpResponse) : Array<string> {
  const result: Array<string> = [];
  result.push(`${response.protocol} ${response.statusCode} ${response.statusMessage ? `- ${response.statusMessage}` : ''}`);
  result.push(...toHttpStringHeader(response.headers));
  if (isString(response.body)) {
    result.push('');
    result.push(response.body);
  }
  return result;
}


export function toHttpStringRequest(request: Request) : Array<string> {
  const result: Array<string> = [];
  result.push(`${request.method} ${request.url}`);
  if (request.headers) {
    result.push(...toHttpStringHeader(request.headers));
  }
  if (isString(request.body)) {
    result.push('');
    result.push(request.body);
  }
  return result;
}

export function toHttpStringHeader(headers: Record<string, unknown>): Array<string> {
  return Object.entries(headers)
    .map(([key, value]) => {
      let val = value || '';
      if (value) {
        if (Array.isArray(value)) {
          val = value.join(', ');
        }
      }
      return `${key}: ${val}`;
    });
}
