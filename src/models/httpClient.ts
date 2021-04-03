import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { HttpClientContext } from './httpClientContext';


export type HttpClient = (request: HttpRequest, context: HttpClientContext) => Promise<HttpResponse | false>;