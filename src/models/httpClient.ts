import { HttpClientContext } from './httpClientContext';
import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';

export type HttpClient = (request: HttpRequest, context: HttpClientContext) => Promise<HttpResponse | false>;
