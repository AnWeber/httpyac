import { ContentType } from './contentType';
import { HttpMethod } from './httpMethod';
import { HttpTimings } from './httpTimings';

export interface HttpResponse{
  httpVersion?: string;
  statusCode: number;
  statusMessage?: string;
  timings?: HttpTimings,
  headers: HttpHeaders;
  contentType?: ContentType;
  body?: unknown;
  parsedBody?: unknown;
  prettyPrintBody?: string;
  rawBody?: Buffer;
  request?: HttpResponseRequest;
  meta?: Record<string, unknown>
}

export interface HttpResponseRequest{
  method: HttpMethod;
  url: unknown;
  headers: HttpHeaders;
  body?: unknown;
  https?: {
    certificate?: unknown;
    pfx?: unknown;
  }
}

export type HttpHeaders = Record<string, string | string[] | undefined | null>;
