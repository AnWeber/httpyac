import { HttpRegion } from './httpRegion';
import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { RequestLogger } from './logHandler';
import { Progress } from './processorContext';
import { RepeatOptions } from './repeatOptions';

export interface HttpClientContext {
  progress?: Progress | undefined;
  showProgressBar?: boolean;
  repeat?: RepeatOptions;
  httpRegion?: HttpRegion;
  logResponse?: RequestLogger;
  config?: {
    request?: Record<string, unknown>;
    proxy?: string;
  };
}

export type HttpClientRequest = Partial<HttpRequest> & Omit<HttpRequest, 'options'>;

export type HttpClient = (request: HttpClientRequest, context: HttpClientContext) => Promise<HttpResponse | false>;

export interface HttpClientProvider {
  exchange?: HttpClient;
}
