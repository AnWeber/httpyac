import * as models from '../../models';
import * as utils from '../../utils';
import { getClientOptions, toHttpResponse } from './gotUtils';
import { default as got, CancelError, Response, CancelableRequest } from 'got';

export class HttpRequestClient extends models.AbstractRequestClient<typeof got> {
  constructor(private readonly request: models.Request, private readonly context: models.ProcessorContext) {
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

  async connect(): Promise<void> {
    // nothing
  }

  private cancelableRequest: CancelableRequest<Response<unknown>> | undefined;

  async send(body?: string | Buffer): Promise<void> {
    if (utils.isHttpRequest(this.request) && this.request.url) {
      try {
        const options = getClientOptions(this.request, this.context);
        if (body) {
          options.body = body;
        }
        this.cancelableRequest = got(this.request.url, options);
        this.registerEvents(this.cancelableRequest);
        const response = await this.cancelableRequest;
        this.onMessage('message', toHttpResponse(response, this.request));
      } catch (err) {
        if (err instanceof CancelError) {
          return;
        }
        throw err;
      } finally {
        delete this.cancelableRequest;
      }
    }
  }

  override close(err?: Error): void {
    if (err) {
      this.cancelableRequest?.cancel();
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
          message: args.length > 0 ? `${event}: ${utils.toString(args[0])}` : event,
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
