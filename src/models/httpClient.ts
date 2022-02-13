import { HttpClientContext } from './httpClientContext';
import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';

export type HttpClientRequest = Partial<HttpRequest> & Omit<HttpRequest, 'options'>;

export type HttpClient = (request: HttpClientRequest, context: HttpClientContext) => Promise<HttpResponse | false>;
