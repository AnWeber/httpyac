import type { OptionsOfUnknownResponseBody } from 'got';

import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';
import { ProcessorContext } from './processorContext';

export interface HeadersContainer {
  headers: Record<string, unknown>;
}

export type RequestBody = string | Array<HttpRequestBodyLine> | Buffer;

export interface Request<TMethod extends string = string, TBody = RequestBody> {
  supportsStreaming?: boolean;
  protocol?: string;
  url: string;
  method?: TMethod;
  body?: TBody;
  headers?: Record<string, unknown>;
  contentType?: ContentType;
  noRejectUnauthorized?: boolean;
  noRedirect?: boolean;
  proxy?: string;
  timeout?: number;
}

export interface HttpRequest extends Request<HttpMethod> {
  headers?: Record<string, string | string[] | undefined>;
  options?: OptionsOfUnknownResponseBody;
}

export type HttpRequestBodyLine =
  | string
  | Buffer
  | ((context: ProcessorContext) => Promise<Buffer | string | undefined>);

export interface RequestBodyImport {
  fileName: string;
  injectVariables: boolean;
  encoding: BufferEncoding;
}
