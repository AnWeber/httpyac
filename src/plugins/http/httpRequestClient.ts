import got, { AbortError, type RequestPromise, type Response } from 'got';

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

  private abortController: AbortController | undefined;

  async send(body?: unknown): Promise<void> {
    if (utils.isHttpRequest(this.request) && this.request.url) {
      try {
        const options = getClientOptions(this.request, this.context);
        if (body) {
          options.body = utils.toBufferLike(body);
        }
        this.abortController = new AbortController();
        options.signal = options.signal
          ? AbortSignal.any([options.signal, this.abortController.signal])
          : this.abortController.signal;
        const request = got(this.request.url, options);
        this.registerEvents(request);
        const response = await request;
        this.onMessage('message', toHttpResponse(response, this.request));
      } catch (err) {
        if (err instanceof AbortError) {
          return;
        }
        if (err instanceof TypeError && err.message === 'Invalid URL') {
          err.message = `Invalid URL: ${(err as { input?: string }).input || this.request.url}`;
        }
        throw err;
      } finally {
        delete this.abortController;
      }
    }
  }

  override disconnect(err?: Error): void {
    if (err) {
      this.abortController?.abort();
      this.onDisconnect();
    }
  }

  private registerEvents(request: RequestPromise<Response<string>>) {
    request.on('downloadProgress', data => {
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
    request.on('redirect', metaDataFactory('redirect'));
    request.on('retry', metaDataFactory('retry'));
    request.on('downloadProgress', metaDataFactory('downloadProgress'));
    request.on('uploadProgress', metaDataFactory('uploadProgress'));
  }
}
