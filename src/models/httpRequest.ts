
import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';
import { OptionsOfUnknownResponseBody } from 'got';

export interface HttpRequest extends OptionsOfUnknownResponseBody{
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string | string[] | undefined>;
  contentType?: ContentType;
  parserBody?: string | Array<string | (() => Promise<Buffer>)>;
  proxy?: string;
}