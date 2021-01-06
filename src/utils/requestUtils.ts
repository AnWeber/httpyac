import { HttpMethod, HttpRequest, HttpResponse, HttpTimings } from '../httpRegion';
import { isString } from './stringUtils';
import { EOL } from 'os';

export function isRequestMethod(method: string | undefined): method is HttpMethod {
  if (method) {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'].includes(method.toUpperCase());
  }
  return false;
}

export function getHeader(headers: Record<string, string | string[] | undefined | null>, headerName: string) {
  if (headers) {
    const value = Object.entries(headers)
      .find(obj => obj[0].toLowerCase() === headerName.toLowerCase());
    if (value && value.length > 1) {
      return value[1];
    }
  }
  return undefined;
}

export function headersToArray(headers: Record<string, string | string[] | undefined | null>) {
  return Object.entries(headers)
    .map(header => `${header[0]}: ${header.length > 1 ? header[1] : ''}`)
    .sort();
}

export function responseToString(response: HttpResponse) {
  const contents = [`HTTP${response.httpVersion || ''} ${response.statusCode} - ${response.statusMessage}`];
  contents.push(...headersToArray(response.headers));
  return contents.join(EOL);
}

export function timingsToString(timings: HttpTimings) {
  return Object.entries(timings)
    .map(timings => `${timings[0].toUpperCase()}: ${timings.length > 1 ? timings[1] : '-'} ms`)
    .sort().join(EOL);
}
export function requestToString(request: HttpRequest) {
  const contents = [`${request.method} ${request.url}`];
  contents.push(...headersToArray(request.headers));
  if (isString(request.body)) {
    contents.push('');
    contents.push(request.body);
  }
  return contents.join(EOL);
}

