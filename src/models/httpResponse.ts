import { ContentType } from './contentType';
import { HttpClientOptions } from './httpClientOptions';
import { HttpTimings } from './httpTimings';

export interface HttpResponse{
  httpVersion?: string;
  statusCode: number;
  statusMessage: string | undefined;
  timings: HttpTimings,
  headers: Record<string, string | string[] | undefined | null>;
  contentType?: ContentType;
  body: unknown;
  rawBody: Buffer;
  request?: HttpClientOptions;
  meta?: Record<string, any>
}