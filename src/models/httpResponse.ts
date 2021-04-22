import { NormalizedOptions } from 'got';
import { ContentType } from './contentType';
import { HttpTimings } from './httpTimings';

export interface HttpResponse{
  httpVersion?: string;
  statusCode: number;
  statusMessage: string | undefined;
  timings: HttpTimings,
  headers: Record<string, string | string[] | undefined | null>;
  contentType?: ContentType;
  body: unknown;
  parsedBody?: unknown;
  rawBody?: Buffer;
  request?: NormalizedOptions;
  meta?: Record<string, unknown>
}