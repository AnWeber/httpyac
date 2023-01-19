import { ContentType } from './contentType';
import { Request } from './httpRequest';
import { HttpTimings } from './httpTimings';

export interface HttpResponse {
  protocol: string;
  name?: string;
  httpVersion?: string;
  statusCode: number;
  statusMessage?: string;
  headers?: Record<string, unknown>;
  contentType?: ContentType;
  body?: unknown;
  parsedBody?: unknown;
  prettyPrintBody?: string;
  rawHeaders?: string[];
  rawBody?: Buffer;
  request?: Request;

  timings?: HttpTimings;
  meta?: Record<string, unknown>;
  tags?: Array<string>;
}

export interface StreamResponse {
  message?: string;
}
