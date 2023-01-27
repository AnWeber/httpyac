import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { filesize } from 'filesize';
import { default as got, OptionsOfUnknownResponseBody, CancelError, Response, CancelableRequest } from 'got';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import merge from 'lodash/merge';
import { SocksProxyAgent } from 'socks-proxy-agent';

export class HttpRequestClient extends models.AbstractRequestClient<typeof got> {
  constructor(private readonly request: models.Request, private readonly context: models.ProcessorContext) {
    super();
  }
  get reportMessage(): string {
    return `perform Http Request (${this.request.url})`;
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
        const options = this.getClientOptions(this.request);
        if (body) {
          options.body = body;
        }
        this.cancelableRequest = got(this.request.url, options);
        this.registerEvents(this.cancelableRequest);
        const response = await this.cancelableRequest;
        this.onMessage('message', this.toHttpResponse(response, this.request));
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

  private toHttpResponse(response: Response<unknown>, request: models.Request) {
    return {
      name: `${response.statusCode} - ${request.method || 'GET'} ${request.url}`,
      statusCode: response.statusCode,
      protocol: `HTTP/${response.httpVersion}`,
      statusMessage: response.statusMessage,
      body: response.body,
      rawHeaders: response.rawHeaders,
      rawBody: response.rawBody,
      headers: response.headers,
      timings: response.timings.phases,
      httpVersion: response.httpVersion,
      request: {
        protocol: 'HTTP',
        method: response.request.options.method,
        url: `${response.request.options.url}`,
        headers: response.request.options.headers,
        body: this.getBody(response.request.options.body),
      },
      contentType: utils.parseContentType(response.headers),

      meta: {
        ip: response.ip,
        redirectUrls: response.redirectUrls,
        size: filesize(
          response.rawHeaders.map(obj => obj.length).reduce((size, current) => size + current, 0) +
            (response.rawBody?.length || 0)
        ),
      },
    };
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

  private getClientOptions(request: models.HttpRequest): OptionsOfUnknownResponseBody {
    const { config } = this.context;

    const options: OptionsOfUnknownResponseBody = merge(
      {
        decompress: true,
        retry: 0,
        throwHttpErrors: false,
        headers: {
          accept: '*/*',
          'user-agent': 'httpyac',
        },
      },
      config?.request,
      {
        method: request.method,
        headers: request.headers,
        body: request.body,
      },
      request.options
    );

    if (request.noRedirect) {
      options.followRedirect = false;
    }
    if (request.noRejectUnauthorized) {
      options.https = request.options.https || {};
      options.https.rejectUnauthorized = false;
    }
    this.initProxy(options, request.proxy || config?.proxy);
    this.ensureStringHeaders(options.headers);

    io.log.debug('request', options);
    return options;
  }

  private initProxy(options: OptionsOfUnknownResponseBody, proxy: string | undefined) {
    if (proxy) {
      if (proxy.startsWith('socks://')) {
        const socksProxy = new SocksProxyAgent(proxy);
        options.agent = {
          http: socksProxy,
          https: socksProxy,
        };
      } else {
        options.agent = {
          http: new HttpProxyAgent(proxy),
          https: new HttpsProxyAgent(proxy),
        };
      }
    }
  }
  private ensureStringHeaders(headers?: Record<string, unknown>) {
    if (headers) {
      for (const [header, val] of Object.entries(headers)) {
        if (typeof val !== 'undefined') {
          let result: string | string[];
          if (Array.isArray(val)) {
            result = val.map(obj => utils.toString(obj) || obj);
          } else {
            result = utils.toString(val) || '';
          }
          headers[header] = result;
        }
      }
    }
  }
  private getBody(body: unknown) {
    if (typeof body === 'string') {
      return body;
    }
    if (Buffer.isBuffer(body)) {
      return body;
    }
    return undefined;
  }
}
