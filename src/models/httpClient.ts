import { HttpClientOptions } from './httpClientOptions';
import { HttpResponse } from './httpResponse';
import { Progress } from './processorContext';

export type HttpClient = (options: HttpClientOptions, progress: Progress |undefined) => Promise<HttpResponse | false>;