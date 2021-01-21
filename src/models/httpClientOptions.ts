import { HttpMethod } from './httpMethod';

export interface HttpClientOptions{
  method: HttpMethod;
  headers: Record<string, string | string[] | undefined | null>;
  body?: string | Buffer;
  proxy?: string;
}