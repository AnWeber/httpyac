import * as models from '../../../models';
import * as utils from '../../../utils';
import { ContentType, HttpResponse, ResponseHeaders, TextStreamResponse } from './stubs';
import { Document } from '@xmldom/xmldom';

export class IntellijHttpResponse implements HttpResponse {
  body: string | TextStreamResponse | Document | unknown;
  status: number;
  contentType: ContentType;
  headers: ResponseHeaders;

  constructor(response: models.HttpResponse) {
    this.body = response.parsedBody || response.body;
    this.status = response.statusCode;
    this.contentType = toContentType(response.contentType);
    this.headers = new IntellijHeaders(response.headers);
  }
}

function toContentType(contentType?: models.ContentType) {
  return {
    mimeType: contentType?.mimeType || 'application/octet-stream',
    charset: contentType?.charset || 'utf-8',
  };
}

export class IntellijHeaders implements ResponseHeaders {
  constructor(private readonly headers: Record<string, unknown> | undefined) {}

  valueOf(headerName: string): string | null {
    if (this.headers) {
      const obj = utils.getHeader(this.headers, headerName);
      if (obj && utils.isString(obj)) {
        return obj;
      }
    }
    return null;
  }
  valuesOf(headerName: string): string[] {
    if (this.headers) {
      const obj = utils.getHeader(this.headers, headerName);
      if (obj) {
        if (utils.isString(obj)) {
          return [obj];
        }
        if (Array.isArray(obj)) {
          return obj;
        }
      }
    }
    return [];
  }
}

export class IntellijTextStreamResponse implements HttpResponse {
  body: TextStreamResponse;
  status = 0;
  contentType: ContentType = toContentType();
  headers: ResponseHeaders;

  private lazyHeaders: Record<string, unknown> = {};
  constructor(
    private readonly requestClient: models.RequestClient,
    private readonly resolve: () => void
  ) {
    this.body = {
      onEachLine: (...args) => this.onEachLine(...args),
      onEachMessage: (...args) => this.onEachMessage(...args),
    };
    this.headers = new IntellijHeaders(this.lazyHeaders);
  }
  onEachLine(
    subscriber: (line: string | object, unsubscribe: () => void) => void,
    onFinish?: (() => void) | undefined
  ): void {
    this.onEachMessage(subscriber, onFinish);
  }
  onEachMessage(
    subscriber: (
      message: string | object,
      unsubscribe: () => void,
      output?: ((answer: string) => void) | undefined
    ) => void,
    onFinish?: (() => void) | undefined
  ): void {
    const subscriberHandler = (evt: models.RequestClientEvent<[string, models.HttpResponse]>) => {
      const [, response] = evt.detail;
      this.status = response.statusCode;
      Object.assign(this.headers, response.headers);
      this.contentType = toContentType(response.contentType);

      const message = utils.toString(response.body);
      if (message) {
        const unsubscribe = () => {
          this.requestClient.removeEventListener('message', subscriberHandler);
          this.resolve();
        };
        const output = (answer: string) => this.requestClient.send(answer);
        subscriber(message, unsubscribe, output);
      }
    };
    this.requestClient.addEventListener('message', subscriberHandler);
    if (onFinish) {
      this.requestClient.addEventListener('end', onFinish);
    }
  }
}
