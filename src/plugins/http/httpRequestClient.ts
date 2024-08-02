import { CancelableRequest, CancelError, default as got, Response } from 'got';

import * as models from '../../models';
import * as utils from '../../utils';
import { getClientOptions, toHttpResponse } from './gotUtils';

export class HttpRequestClient extends models.AbstractRequestClient<typeof got> {
  constructor(
    private readonly request: models.Request,
    private readonly context: models.ProcessorContext
  ) {
    super();
  }
  get reportMessage(): string {
    return `perform Http Request (${this.request.url})`;
  }

  get supportsStreaming() {
    return false;
  }

  get nativeClient(): typeof got {
    return got;
  }

  async connect(): Promise<typeof got> {
    return this.nativeClient;
  }

  private cancelableRequest: CancelableRequest<Response<unknown>> | undefined;

  async send(body?: unknown): Promise<void> {
    if (utils.isHttpRequest(this.request) && this.request.url) {
      try {
        const options = getClientOptions(this.request, this.context);
        if (body) {
          options.body = utils.toBufferLike(body);
        }
        this.cancelableRequest = got(this.request.url, options);
        this.registerEvents(this.cancelableRequest);
        const response = await this.cancelableRequest;
        this.onMessage('message', toHttpResponse(response, this.request));
      } catch (err) {
        if (err instanceof CancelError) {
          return;
        }
        if (err instanceof TypeError && err.message === 'Invalid URL') {
          err.message = `Invalid URL: ${(err as { input?: string }).input || this.request.url}`;
        }
        throw err;
      } finally {
        delete this.cancelableRequest;
      }
    }
  }

  override disconnect(err?: Error): void {
    if (err) {
      this.cancelableRequest?.cancel();
      this.onDisconnect();
    }
  }

  private registerEvents(cancelableRequest: CancelableRequest<Response<unknown>>) {
    cancelableRequest.on('downloadProgress', data => {
      this.onProgress(data.percent);
    });

    const metaDataFactory =
      (event: string) =>
      (...args: Array<unknown>) => {
        this.onMetaData(event, {
          protocol: 'HTTP',
          statusCode: 0,
          message: args.length > 0 ? `${utils.toString(args[0])}` : undefined,
          body: {
            ...args,
          },
        });
      };
    cancelableRequest.on('redirect', metaDataFactory('redirect'));
    cancelableRequest.on('retry', metaDataFactory('retry'));
    cancelableRequest.on('downloadProgress', metaDataFactory('downloadProgress'));
    cancelableRequest.on('uploadProgress', metaDataFactory('uploadProgress'));
  }
}
