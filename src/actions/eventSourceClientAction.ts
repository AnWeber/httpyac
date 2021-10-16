import * as models from '../models';
import * as utils from '../utils';
import EventSource from 'eventsource';
import * as io from '../io';


export class EventSourceClientAction implements models.HttpRegionAction {
  id = models.ActionType.eventSourceClient;


  async process(context: models.ProcessorContext): Promise<boolean> {
    const { request } = context;
    if (utils.isEventSourceRequest(request)) {
      return await utils.triggerRequestResponseHooks(async () => {
        if (request.url) {
          return await this.requestEventSource(request, context);
        }
        return false;
      }, context);
    }
    return false;
  }

  private async requestEventSource(
    request: models.EventSourceRequest,
    context: models.ProcessorContext
  ): Promise<models.HttpResponse> {
    const { httpRegion } = context;

    const startTime = new Date().getTime();

    if (!request.url) {
      throw new Error('request url undefined');
    }
    const options: EventSource.EventSourceInitDict = {};
    if (httpRegion.metaData.noRejectUnauthorized) {
      options.rejectUnauthorized = false;
    }
    options.headers = request.headers;

    const responseTemplate: Partial<models.HttpResponse> = {
      request
    };
    const mergedData: Array<unknown> = [];
    const loadingPromises: Array<Promise<unknown>> = [];

    const getResponseTemplate: (() => Partial<models.HttpResponse>) = () => {
      responseTemplate.timings = {
        total: new Date().getTime() - startTime,
      };
      return responseTemplate;
    };

    let disposeCancellation: models.Dispose | undefined;
    try {
      const client = new EventSource(request.url, options);
      if (context.progress) {
        disposeCancellation = context.progress?.register?.(() => {
          client.close();
        });
      }
      client.addEventListener('open', evt => {
        io.log.debug('received open', evt);
      });
      client.addEventListener('data', evt => {
        io.log.debug('received open', evt);
        mergedData.push(evt);
        if (!context.httpRegion.metaData.noStreamingLog) {
          loadingPromises.push(utils.logResponse(this.toHttpResponse(evt, getResponseTemplate()), context));
        }
      });
      client.addEventListener('error', evt => {
        io.log.debug('received error', evt);
        mergedData.push(evt);
      });
      await context.httpRegion.hooks.onStreaming.trigger(context);
      await Promise.all(loadingPromises);
      client.close();
      const response = this.toMergedHttpResponse(mergedData, getResponseTemplate());
      return response;
    } finally {
      if (disposeCancellation) {
        disposeCancellation();
      }
    }
  }

  private isEventType(evt: unknown) : evt is {type: string} {
    const data = evt as { type: string };
    return !!data?.type;
  }

  private toMergedHttpResponse(data: Array<unknown>, responseTemplate: Partial<models.HttpResponse>): models.HttpResponse {
    const response = this.toHttpResponse(data, responseTemplate);
    const error = data.find(obj => this.isEventType(obj) && obj.type === 'error');
    if (utils.isError(error)) {
      response.statusCode = -1;
    }
    return response;
  }


  private toHttpResponse(data: unknown, responseTemplate: Partial<models.HttpResponse>): models.HttpResponse {
    const body = JSON.stringify(data, null, 2);
    const rawBody: Buffer = Buffer.from(body);
    const response: models.HttpResponse = {
      headers: {},
      statusCode: 200,
      ...responseTemplate,
      protocol: 'SSE',
      body,
      prettyPrintBody: body,
      parsedBody: data,
      rawBody,
      contentType: {
        mimeType: 'application/json',
        charset: 'UTF-8',
        contentType: 'application/json; charset=utf-8'
      },
    };
    if (this.isEventType(data) && data.type === 'error') {
      response.statusCode = -1;
    }
    return response;
  }
}
