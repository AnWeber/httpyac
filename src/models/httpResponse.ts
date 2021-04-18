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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedBody?: any;
  rawBody?: Buffer;
  request?: NormalizedOptions;
  meta?: Record<string, unknown>
}