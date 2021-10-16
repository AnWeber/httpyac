import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';
import { OptionsOfUnknownResponseBody } from 'got';
import { ClientOptions } from 'ws';
export interface HeadersContainer {
  headers: Record<string, unknown>
}


export type Request = GrpcRequest | HttpRequest | WebsocketRequest | EventSourceRequest;

export interface GrpcRequest {
  url?: string;
  method?: 'GRPC';
  headers?: Record<string, unknown>;
  body?: unknown;
  contentType?: undefined;
}

export interface WebsocketRequest {
  url?: string;
  method?: 'WSS';
  headers?: Record<string, string>;
  body?: unknown;
  options?: ClientOptions;
  contentType?: undefined;
}

export interface EventSourceRequest {
  url?: string;
  method?: 'SSE';
  headers?: Record<string, string>;
  body?: undefined;
  contentType?: undefined;
}

export interface HttpRequest extends Omit<OptionsOfUnknownResponseBody, 'body'>{
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string | string[] | undefined>;
  contentType?: ContentType;
  body?: string | Array<HttpRequestBodyLine> | Buffer;
  rawBody?: Array<string | RequestBodyImport>,
  proxy?: string;
}


export type HttpRequestBodyLine = string | (() => Promise<Buffer>);


export interface RequestBodyImport {
  fileName: string;
  injectVariables: boolean;
  encoding: BufferEncoding
}
