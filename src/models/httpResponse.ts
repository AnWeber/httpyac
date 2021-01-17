import { ContentType } from './contentType';
import { HttpRequest } from './httpRequest';
import { HttpTimings } from './httpTimings';

export interface HttpResponse<T = unknown>{
  httpVersion?: string;
  statusCode: number;
  statusMessage: string | undefined;
  timings: HttpTimings,
  headers: Record<string, string | string[] | undefined | null>;
  contentType?: ContentType;
  body: T;
  rawBody: Buffer;
  request?: HttpRequest;
}