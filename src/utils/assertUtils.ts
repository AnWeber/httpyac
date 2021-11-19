import { HttpResponse } from '../models';
import { getHeader } from './requestUtils';
import { isString } from './stringUtils';
import { strictEqual, ok } from 'assert';

export function assertStatusEquals(response: HttpResponse, status: number): void {
  strictEqual(response.statusCode, status, `response status equals to ${status}`);
}

export function assertMaxTotalTime(response: HttpResponse, maxTotalTime: number): void {
  ok(response.timings?.total ? response.timings.total < maxTotalTime : true, `total time exceeded ${maxTotalTime}`);
}

export function assertHeaderEquals(
  response: HttpResponse,
  headerKey: string,
  val: string | string[] | undefined
): void {
  const headerValue = getHeader(response.headers, headerKey);
  strictEqual(headerValue, val, `response header equals ${val}`);
}

export function assertHeaderContains(response: HttpResponse, headerKey: string, val: string): void {
  const headerValue = getHeader(response.headers, headerKey);
  if (isString(headerValue) || Array.isArray(headerValue)) {
    ok(headerValue.indexOf(val), `response header contains ${val}`);
  }
}

export function assertResponsetimeLower(response: HttpResponse, maxTotal: number): void {
  if (response.timings?.total) {
    ok(response.timings.total <= maxTotal, `response time lower ${maxTotal}`);
  }
}

export function assertHasResponseBody(response: HttpResponse): void {
  ok(!!response.body, 'response body exists');
}
export function assertHasNoResponseBody(response: HttpResponse): void {
  ok(!response.body, 'response body does not exists');
}

export function assertResponseBodyEquals(response: HttpResponse, val: unknown): void {
  strictEqual(response.body, val, `response body equals ${val}`);
}
