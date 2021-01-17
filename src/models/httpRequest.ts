import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';

export interface HttpRequest<TOptions = any>{
  url: string;
  method: HttpMethod;
  headers: Record<string, string | string[] | undefined | null>;
  contentType?: ContentType;
  body?: string | Array<string | (() => Promise<Buffer>)>;
  options?: TOptions;
}