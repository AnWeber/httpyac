import { HttpClientOptions } from './httpClientOptions';
import { HttpResponse } from './httpResponse';

export type HttpClient = (url: string, options: HttpClientOptions) => Promise<HttpResponse>;