
export interface HttpFile{
  fileName: string;
  httpRegions: Array<HttpRegion>;
  variables: Record<string, any>;
  env: string | undefined;
  imports?: Array<() => Promise<HttpFile>>;
}

export interface HttpRegion<TOptions = any>{
  disabled: boolean;
  actions: Array<HttpRegionAction>;
  request?: HttpRequest<TOptions>;
  response?: HttpResponse;
  position: {
    start: number;
    requestLine?: number;
    end: number;
  };
  source?: string;
  metaParams?: Record<string, string | undefined>;
}

export interface HttpRequest<TOptions = any>{
  url: string;
  method: HttpMethod;
  headers: Record<string, string | string[] | undefined | null>;
  contentType?: ContentType;
  body?: string | Array<string | (() => Promise<Buffer>)>;
  options?: TOptions;
}
export interface HttpResponse<T = unknown>{
  httpVersion?: string;
  statusCode: number;
  statusMessage: string | undefined;
  timings: HttpTimings,
  headers: Record<string, string | string[] | undefined | null>;
  contentType?: ContentType;
  body: T;
  rawBody: Buffer;
}

export interface HttpTimings{
  wait?: number;
  dns?: number;
  tcp?: number;
  tls?: number;
  request?: number;
  firstByte?: number;
  download?: number;
  total?: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD' | 'DELETE' | 'OPTIONS' | 'TRACE' | 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'options' | 'trace';

export interface ContentType{
  mimeType: string;
  contentType: string;
  charset?: string | undefined;
}
export interface HttpRegionAction<T = any> {
  data?: T;
  type: string;
  processor: HttpRegionActionProcessor<T>;
}
export type HttpRegionActionProcessor<T> = (data: T, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) => Promise<void>;
