import { HttpResponse } from '../models';
import { getHeader } from './requestUtils';
import { isString } from './stringUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertStatusEquals(response: HttpResponse, status: number): void {
  assert(response.statusCode === status, `response status is ${response.statusCode} (expected: ${status})`);
}

export function assertMaxTotalTime(response: HttpResponse, maxTotalTime: number): void {
  assert(
    response.timings?.total ? response.timings.total < maxTotalTime : true,
    `total time is ${response.timings?.total} (expected max ${maxTotalTime})`
  );
}

export function assertHeaderEquals(
  response: HttpResponse,
  headerKey: string,
  val: string | string[] | undefined
): void {
  const headerValue = getHeader(response.headers, headerKey);
  assert(headerValue === val, `response header ${headerKey} is ${headerValue} (expected: ${val})`);
}

export function assertHeaderContains(response: HttpResponse, headerKey: string, val: string): void {
  const headerValue = getHeader(response.headers, headerKey);
  if (isString(headerValue) || Array.isArray(headerValue)) {
    assert(!!headerValue.indexOf(val), `response header contains ${val}`);
  }
}

export function assertHasResponseBody(response: HttpResponse): void {
  console.assert(!!response.body, 'response body exists');
}
export function assertHasNoResponseBody(response: HttpResponse): void {
  assert(!response.body, 'response body does not exists');
}

export function assertResponseBodyEquals(response: HttpResponse, val: unknown): void {
  assert(response.body === val, `response body equals ${val}`);
}
