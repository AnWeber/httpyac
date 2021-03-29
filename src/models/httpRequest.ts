import { HttpDefaultOptions } from '../gotHttpClientFactory';
import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';

export interface HttpRequest{
  url: string;
  method: HttpMethod;
  headers: Record<string, string | string[] | undefined | null>;
  contentType?: ContentType;
  body?: string | Array<string | (() => Promise<Buffer>)>;
  options?: HttpDefaultOptions;
}