import { HttpClientOptions } from './httpClientOptions';
import { HttpResponse } from './httpResponse';
import { HttpClientContext } from './httpClientContext';


export type HttpClient = (options: HttpClientOptions, context: HttpClientContext) => Promise<HttpResponse | false>;