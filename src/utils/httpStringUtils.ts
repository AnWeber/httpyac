import { HttpResponse, Request } from '../models';
import { isString, toMultiLineString } from './stringUtils';

export function toHttpString(
  response: HttpResponse,
  options?: {
    responseBody?: boolean;
    requestBody?: boolean;
    prettyPrint?: boolean;
  }
): string {
  const result: Array<string> = [];

  if (response.request) {
    result.push(
      ...toHttpStringRequest(response.request, {
        body: !!options?.requestBody,
      })
    );
    result.push('');
  }
  result.push(
    ...toHttpStringResponse(response, {
      prettyPrint: !!options?.prettyPrint,
      body: !!options?.responseBody,
    })
  );

  return toMultiLineString(result);
}

export function toHttpStringResponse(
  response: HttpResponse,
  options?: {
    prettyPrint?: boolean;
    body?: boolean;
  }
): Array<string> {
  const result: Array<string> = [];
  result.push(
    `${response.protocol} ${response.statusCode} ${response.statusMessage ? ` - ${response.statusMessage}` : ''}`
  );
  if (response.headers) {
    result.push(...toHttpStringHeader(response.headers));
  }
  if (options?.body && isString(response.body)) {
    result.push('');
    result.push(options?.prettyPrint && response.prettyPrintBody ? response.prettyPrintBody : response.body);
  }
  return result;
}

export function toHttpStringRequest(
  request: Request,
  options?: {
    body?: boolean;
  }
): Array<string> {
  const result: Array<string> = [];
  result.push(`${request.method} ${request.url}`);
  if (request.headers) {
    result.push(...toHttpStringHeader(request.headers));
  }
  if (options?.body && isString(request.body)) {
    result.push('');
    result.push(request.body);
  }
  return result;
}

export function toHttpStringHeader(headers: Record<string, unknown>): Array<string> {
  return Object.entries(headers).map(([key, value]) => {
    let val = value || '';
    if (value) {
      if (Array.isArray(value)) {
        val = value.join(', ');
      } else if (!isString(value)) {
        val = JSON.stringify(value);
      }
    }
    return `${key}: ${val}`;
  });
}
