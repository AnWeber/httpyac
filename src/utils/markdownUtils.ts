import { EOL } from 'os';
import { ContentType, HttpResponse, HttpTimings, TestResult } from '../models';
import { isString, toMultiLineArray } from './stringUtils';
import * as mimeTypeUtils from './mimeTypeUtils';
import { NormalizedOptions } from 'got';
import { testSymbols } from '../actions';

export function toMarkdown(response: HttpResponse, options?: {
  responseBody?: boolean,
  requestBody?: boolean,
  timings?: boolean,
  meta?: boolean,
  prettyPrint?: boolean;
  testResults?: Array<TestResult>,
}) : string {
  const result: Array<string> = [];

  if (response.request) {
    result.push(...toMarkdownRequest(response.request, {
      body: !!options?.requestBody
    }));
    result.push('');
  }
  result.push(...toMarkdownResponse(response, {
    prettyPrint: !!options?.prettyPrint,
    body: !!options?.responseBody
  }));

  if (options?.testResults) {
    result.push('');
    result.push('');
    result.push(...toMarkdownTestResults(options.testResults));
  }

  if (options?.timings && response.timings) {
    result.push('');
    result.push('');
    result.push(...toMarkdownTimings(response.timings));
  }

  if (options?.meta && response.meta) {
    result.push('');
    result.push('');
    result.push(...toMarkdownMeta(response.meta));
  }


  return joinMarkdown(result);
}

export function toMarkdownResponse(response: HttpResponse, options?: {
  prettyPrint?: boolean;
  body?: boolean;
}) : Array<string> {
  const result: Array<string> = [];
  result.push(`\`HTTP${response.httpVersion || ''} ${response.statusCode} - ${response.statusMessage}\``);
  result.push(...toMarkdownHeader(response.headers));
  if (options?.body && isString(response.body)) {
    result.push('');
    result.push(`\`\`\`${getMarkdownSyntax(response.contentType)}`);
    result.push(joinMarkdown(toMultiLineArray(options.prettyPrint && response.parsedBody ? JSON.stringify(response.parsedBody, null, 2) : response.body)));
    result.push('```');
  }
  return result;
}

export function getMarkdownSyntax(contentType: ContentType | undefined) : string {
  if (mimeTypeUtils.isMimeTypeJSON(contentType)) {
    return 'json';
  }
  if (mimeTypeUtils.isMimeTypeXml(contentType)) {
    return 'xml';
  }
  if (mimeTypeUtils.isMimeTypeHtml(contentType)) {
    return 'html';
  }
  if (mimeTypeUtils.isMimeTypeJavascript(contentType)) {
    return 'js';
  }
  if (mimeTypeUtils.isMimeTypeCSS(contentType)) {
    return 'css';
  }
  if (mimeTypeUtils.isMimeTypeMarkdown(contentType)) {
    return 'markdown';
  }
  return '';
}

export function toMarkdownRequest(request: NormalizedOptions, options?: {
  body?: boolean;
}) : Array<string> {
  const result: Array<string> = [];
  result.push(`\`${request.method} ${request.url}\``);
  if (request.headers) {
    result.push(...toMarkdownHeader(request.headers));
  }
  if (options?.body && isString(request.body)) {
    result.push('');
    result.push('```json');
    result.push(joinMarkdown(toMultiLineArray(request.body)));
    result.push('```');
  }
  return result;
}

export function toMarkdownTestResults(testResults: Array<TestResult>) : Array<string> {
  const result: Array<string> = [];
  result.push('`TestResults`');
  result.push('');
  for (const testResult of testResults) {
    let message = `${testResult.result ? testSymbols.ok : testSymbols.error}: ${testResult.message}`;
    if (testResult.error) {
      message += ` (${testResult.error.displayMessage})`;
    }
    result.push(message);
  }
  return result;
}

export function toMarkdownHeader(headers: Record<string, string | string[] | undefined | null>) : Array<string> {
  return Object.entries(headers)
    .map(([key, value]) => {
      let val = value || '';
      if (value) {
        if (Array.isArray(value)) {
          val = value.join(', ');
        }
      }
      return `*${key}*: ${val}`;
    })
    .sort();
}

export function toMarkdownMeta(meta: Record<string, unknown>) : Array<string> {
  const result: Array<string> = [];
  result.push('`Meta`');
  result.push('');
  for (const [key, value] of Object.entries(meta)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        result.push(`*${key}*: ${value.join(',')}`);
      }
    } else {
      result.push(`*${key}*: ${value}`);
    }
  }
  return result;
}

export function toMarkdownTimings(timings: HttpTimings) : Array<string> {
  const result: Array<string> = [];

  result.push('`Timings`');
  result.push('');
  if (timings.wait) {
    result.push(`*Wait*: ${timings.wait} ms`);
  }
  if (timings.dns) {
    result.push(`*DNS*: ${timings.dns} ms`);
  }
  if (timings.tcp) {
    result.push(`*TCP*: ${timings.tcp} ms`);
  }
  if (timings.tls) {
    result.push(`*TLS*: ${timings.tls} ms`);
  }
  if (timings.request) {
    result.push(`*Reqeust*: ${timings.request} ms`);
  }
  result.push(`*First Byte*: ${timings.firstByte} ms`);
  if (timings.download) {
    result.push(`*Download*: ${timings.download} ms`);
  }
  result.push(`*Total*: ${timings.total} ms`);
  return result;
}


export function joinMarkdown(lines: string[]) : string {
  return lines.join(`  ${EOL}`);
}
