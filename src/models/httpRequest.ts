import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';
import { OptionsOfUnknownResponseBody } from 'got';
import { IClientOptions as MQTTOptions } from 'mqtt';
import { ClientOptions as WebsocketOptions } from 'ws';

export interface HeadersContainer {
  headers: Record<string, unknown>;
}

export type Request = GrpcRequest | HttpRequest | WebsocketRequest | EventSourceRequest | MQTTRequest;

export interface GrpcRequest {
  url?: string;
  method?: 'GRPC';
  headers?: Record<string, unknown>;
  body?: unknown;
  contentType?: undefined;
}

export interface WebsocketRequest {
  url?: string;
  method?: 'WS';
  headers?: Record<string, string>;
  body?: unknown;
  options?: WebsocketOptions;
  contentType?: undefined;
}

export interface MQTTRequest {
  url?: string;
  method?: 'MQTT';
  headers?: Record<string, string | undefined>;
  body?: string;
  contentType?: undefined;
  options?: MQTTOptions;
}
export interface EventSourceRequest {
  url?: string;
  method?: 'SSE';
  headers?: Record<string, string>;
  body?: undefined;
  contentType?: undefined;
}

export interface HttpRequest extends Omit<OptionsOfUnknownResponseBody, 'body'> {
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string | string[] | undefined>;
  contentType?: ContentType;
  body?: string | Array<HttpRequestBodyLine> | Buffer;
  rawBody?: Array<string | RequestBodyImport>;
  proxy?: string;
}

export type HttpRequestBodyLine = string | (() => Promise<Buffer>);

export interface RequestBodyImport {
  fileName: string;
  injectVariables: boolean;
  encoding: BufferEncoding;
}
