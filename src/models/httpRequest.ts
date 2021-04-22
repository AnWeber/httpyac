
import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';
import { OptionsOfUnknownResponseBody } from 'got';

export interface HttpRequest extends Omit<OptionsOfUnknownResponseBody, 'body'>{
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string | string[] | undefined>;
  contentType?: ContentType;
  body?: string | Array<HttpRequestBodyLine> | Buffer;
  proxy?: string;
}


export type HttpRequestBodyLine = string | (() => Promise<Buffer>);