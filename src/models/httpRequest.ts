import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';
import { OptionsOfUnknownResponseBody } from 'got';

export interface HeadersContainer {
  headers: Record<string, unknown>
}


export type Request = GrpcRequest | HttpRequest;

export interface GrpcRequest {
  url?: string;
  method?: 'GRPC';
  headers?: Record<string, unknown>;
  body?: unknown;
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
