import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';
import type { OptionsOfUnknownResponseBody } from 'got';

export interface HeadersContainer {
  headers: Record<string, unknown>;
}

export interface Request<TMethod extends string = string> {
  protocol?: string;
  url?: string;
  method?: TMethod;
  body?: unknown;
  headers?: Record<string, unknown>;
  contentType?: ContentType;
}

export interface HttpRequest extends Request<HttpMethod> {
  body?: string | Array<HttpRequestBodyLine> | Buffer;
  headers?: Record<string, string | string[] | undefined>;
  proxy?: string;
  options: OptionsOfUnknownResponseBody;
}

export type HttpRequestBodyLine = string | (() => Promise<Buffer>);

export interface RequestBodyImport {
  fileName: string;
  injectVariables: boolean;
  encoding: BufferEncoding;
}
