import * as io from '../io';
import * as models from '../models';
import * as utils from '../utils';
import EventSource from 'eventsource';

export class EventSourceClientAction implements models.HttpRegionAction {
  id = models.ActionType.eventSourceClient;

  async process(context: models.ProcessorContext): Promise<boolean> {
    const { request } = context;
    if (utils.isEventSourceRequest(request)) {
      return await utils.triggerRequestResponseHooks(async () => {
        if (request.url) {
          utils.report(context, `reqeust Server-Sent Events ${request.url}`);
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

    if (!request.url) {
      throw new Error('request url undefined');
    }
    const options: EventSource.EventSourceInitDict = {};
    if (httpRegion.metaData.noRejectUnauthorized) {
      options.rejectUnauthorized = false;
    }
    const events = utils.getHeaderArray(request.headers, 'event') || ['data'];
    const headers = { ...request.headers };
    utils.deleteHeader(headers, 'event');
    options.headers = headers;

    const responseTemplate: Partial<models.HttpResponse> = {
      request,
    };
    const eventStream: { [key: string]: Array<unknown> } = {};
    const loadingPromises: Array<Promise<unknown>> = [];

    let disposeCancellation: models.Dispose | undefined;
    try {
      const client = new EventSource(request.url, options);
      if (context.progress) {
        disposeCancellation = context.progress?.register?.(() => {
          client.close();
        });
      }
      client.addEventListener('open', evt => {
        io.log.debug('SSE open', evt);
      });

      for (const eventType of events) {
        client.addEventListener(eventType, evt => {
          io.log.debug(`SSE ${eventType}`, evt);
          if (this.isMessageEvent(evt)) {
            if (!eventStream[evt.type]) {
              eventStream[evt.type] = [];
            }
            eventStream[evt.type].push(evt.data);
            if (!context.httpRegion.metaData.noStreamingLog) {
              if (context.logStream) {
                loadingPromises.push(context.logStream('EventSource', evt.type, evt.data));
              } else {
                loadingPromises.push(utils.logResponse(this.toHttpResponse(evt, responseTemplate), context));
              }
            }
          }
        });
      }
      client.addEventListener('error', evt => {
        io.log.debug('SSE error', evt);
        eventStream.error = [evt];
      });
      await context.httpRegion.hooks.onStreaming.trigger(context);
      await Promise.all(loadingPromises);
      client.close();
      const response = this.toMergedHttpResponse(eventStream, responseTemplate);
      return response;
    } finally {
      if (disposeCancellation) {
        disposeCancellation();
      }
    }
  }

  private isEventType(evt: unknown): evt is { type: string } {
    const data = evt as { type: string };
    return !!data?.type;
  }

  private toMergedHttpResponse(
    data: Record<string, Array<unknown>>,
    responseTemplate: Partial<models.HttpResponse>
  ): models.HttpResponse {
    const response = this.toHttpResponse(data, responseTemplate);
    if (data.error) {
      response.statusCode = -1;
    }
    return response;
  }

  private toHttpResponse(data: unknown, responseTemplate: Partial<models.HttpResponse>): models.HttpResponse {
    const body = JSON.stringify(data, null, 2);
    const rawBody: Buffer = Buffer.from(body);
    const response: models.HttpResponse = {
      headers: {},
      statusCode: 0,
      ...responseTemplate,
      protocol: 'SSE',
      body,
      prettyPrintBody: body,
      parsedBody: data,
      rawBody,
      contentType: {
        mimeType: 'application/json',
        charset: 'UTF-8',
        contentType: 'application/json; charset=utf-8',
      },
    };
    if (this.isEventType(data) && data.type === 'error') {
      response.statusCode = -1;
    }
    return response;
  }

  private isMessageEvent(obj: unknown): obj is EventSourceMessageEvent {
    const evt = obj as EventSourceMessageEvent;
    return !!evt.type && utils.isString(evt.type) && !!evt.data;
  }
}

interface EventSourceMessageEvent {
  type: string;
  data: unknown;
}
