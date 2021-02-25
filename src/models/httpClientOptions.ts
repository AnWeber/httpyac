import { HttpMethod } from './httpMethod';

export interface HttpClientOptions{
  url: string,
  method: HttpMethod;
  headers: Record<string, string | string[] | undefined | null>;
  body?: string | Buffer;
  proxy?: string;
  followRedirect?: boolean
}