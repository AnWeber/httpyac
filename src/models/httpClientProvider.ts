import { HttpRegion } from './httpRegion';
import { HttpRequest, Request } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { RequestLogger } from './logHandler';
import { ProcessorContext, Progress } from './processorContext';
import { RepeatOptions } from './repeatOptions';
import { RequestClient } from './requestClient';

export interface HttpClientContext {
  progress?: Progress | undefined;
  isMainContext?: boolean;
  repeat?: RepeatOptions;
  httpRegion?: HttpRegion;
  logResponse?: RequestLogger;
  config?: {
    request?: Record<string, unknown>;
    proxy?: string;
  };
}

export type HttpClientRequest = Partial<HttpRequest> & Omit<HttpRequest, 'protocol'>;

export type HttpClient = (request: HttpClientRequest, context: HttpClientContext) => Promise<HttpResponse | false>;

export interface HttpClientProvider {
  createRequestClient?: (request: Request, context: ProcessorContext) => RequestClient;
  exchange?: HttpClient;
}
