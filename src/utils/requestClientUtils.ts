import { HookCancel } from 'hookpoint';

import { log } from '../io';
import * as models from '../models';
import { isError } from './errorUtils';
import { report } from './logUtils';
import { mergeResponses, repeat } from './repeatUtils';
import { toString } from './stringUtils';
import { deleteVariableInContext, setVariableInContext } from './variableUtils';

export function executeRequestClientFactory<T extends models.RequestClient>(
  requestClientFactory: (request: models.Request, context: models.ProcessorContext) => T
) {
  return async function (context: models.ProcessorContext) {
    const { request } = context;
    if (request?.url) {
      if (!(await onRequest(context))) {
        return false;
      }
      const requestClient = requestClientFactory(request, context);
      setVariableInContext(
        {
          $requestClient: requestClient,
        },
        context
      );
      context.requestClient = requestClient;
      const dispose = registerCancellation(requestClient, context);
      try {
        const messagePromises: Array<Promise<models.HttpResponse | undefined>> = [];
        addProgressEvent(requestClient, context);
        addMessageEvent(requestClient, context, messagePromises);
        addMetaDataEvent(requestClient, context, messagePromises);

        report(context, requestClient.reportMessage);
        await requestClient.connect();
        await Promise.all([
          repeat(() => requestClient.send(), context),
          onStreaming(context).then(() => {
            requestClient.disconnect();
          }),
        ]);

        const messageResponses = await Promise.all(messagePromises);
        const response = mergeResponses(toResponses(...messageResponses));
        if (response) {
          if (!(await onResponse(response, context))) {
            return false;
          }
        }
        requestClient.disconnect();
        return true;
      } catch (err) {
        (context.scriptConsole || log).error(context.request);
        if (isError(err)) {
          requestClient.disconnect(err);
        } else {
          requestClient.disconnect(new Error(toString(err)));
        }
        throw err;
      } finally {
        requestClient.triggerEnd();
        dispose?.();
        delete context.requestClient;
        deleteVariableInContext('$requestClient', context);
      }
    }
    return false;
  };
}

function toResponses(...responses: Array<models.HttpResponse | void | undefined>) {
  const result: Array<models.HttpResponse> = [];

  for (const response of responses) {
    if (response) {
      result.push(response);
    }
  }
  return result;
}

function registerCancellation<T extends models.RequestClient>(client: T, context: models.ProcessorContext) {
  if (context.progress?.register) {
    return context.progress?.register(() => client.disconnect(new Error('user cancellation')));
  }
  return undefined;
}

function addProgressEvent<T extends models.RequestClient>(client: T, context: models.ProcessorContext) {
  if (context.isMainContext && context.progress?.report) {
    let prevPercent = 0;
    client.on('progress', percent => {
      const newData = percent - prevPercent;
      prevPercent = percent;
      if (context.progress?.report) {
        log.debug(`progress to ${percent}`);
        const divider = context.progress.divider || 1;
        context.progress.report({
          message: 'request progress',
          increment: (newData / divider) * 100,
        });
      }
    });
  }
}

function addMessageEvent<T extends models.RequestClient>(
  client: T,
  context: models.ProcessorContext,
  loadingPromises: Array<Promise<models.HttpResponse | void | undefined>>
) {
  client.on('message', ([type, response]) => {
    log.debug(type, response?.message || response?.body);
    loadingPromises.push(Promise.resolve(response));
    if (client.supportsStreaming && !context.httpRegion.metaData.noStreamingLog && context.logStream) {
      loadingPromises.push(context.logStream(type, { ...response }));
    }
  });
}
function addMetaDataEvent<T extends models.RequestClient>(
  client: T,
  context: models.ProcessorContext,
  loadingPromises: Array<Promise<models.HttpResponse | void | undefined>>
) {
  client.on('metaData', ([type, response]) => {
    log.debug(type, response?.message || response?.body);
    if (context.httpRegion.metaData.metaDataLogging && context.logStream) {
      loadingPromises.push(context.logStream(type, response));
    }
  });
}

async function onRequest(context: models.ProcessorContext) {
  const onRequest = context.hooks.onRequest;
  if (context.progress) {
    onRequest.addInterceptor(createIsCanceledInterceptor(() => !!context.progress?.isCanceled()));
  }
  return context.request && (await onRequest.trigger(context.request, context)) !== HookCancel;
}

async function onStreaming(context: models.ProcessorContext) {
  const onStreaming = context.hooks.onStreaming;
  if (context.progress) {
    onStreaming.addInterceptor(createIsCanceledInterceptor(() => !!context.progress?.isCanceled()));
  }
  await onStreaming.trigger(context);
}

async function onResponse(response: models.HttpResponse, context: models.ProcessorContext) {
  const onResponse = context.hooks.onResponse;
  if ((await onResponse.trigger(createResponseProxy(response), context)) === HookCancel) {
    return false;
  }
  context.httpRegion.response = response;
  return true;
}
function createIsCanceledInterceptor(isCanceled: () => boolean) {
  return {
    id: 'isCanceled',
    async beforeTrigger(): Promise<boolean> {
      return !isCanceled();
    },
    async afterTrigger(): Promise<boolean> {
      return !isCanceled();
    },
  };
}
export function createResponseProxy(response: models.HttpResponse): models.HttpResponse {
  const proxy = new Proxy(response, {
    set(...args) {
      const [target, property, value] = args;

      const result = Reflect.set(...args);
      if (property === 'body') {
        delete target.prettyPrintBody;
        delete target.parsedBody;
        delete target.rawBody;
        if (typeof value === 'string') {
          target.rawBody = Buffer.from(value);
        }
      }
      return result;
    },
  });
  return proxy;
}
