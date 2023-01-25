import { log } from '../io';
import * as models from '../models';
import { isError } from './errorUtils';
import { report } from './logUtils';
import { repeat, mergeResponses } from './repeatUtils';
import { toString } from './stringUtils';
import { setVariableInContext, deleteVariableInContext } from './variableUtils';
import { HookCancel } from 'hookpoint';

export function executeRequestClientFactory<T extends models.RequestClient>(
  requestClientFactory: (request: models.Request, context: models.ProcessorContext) => T
) {
  return async function (context: models.ProcessorContext) {
    const { request } = context;
    if (request?.url) {
      if (!(await onRequest(context))) {
        return false;
      }
      const client = requestClientFactory(request, context);
      setVariableInContext(
        {
          $client: client,
        },
        context
      );
      const dispose = registerCancellation(client, context);
      try {
        const messagePromises: Array<Promise<models.HttpResponse | undefined>> = [];
        addProgressEvent(client, context);
        addMessageEvent(client, context, messagePromises);
        addMetaDataEvent(client, context, messagePromises);

        report(context, client.reportMessage);
        const connectResponse = await client.connect();
        const sendResponses = await Promise.all([
          repeat(() => client.send(), context),
          onStreaming(context).then(() => {
            client.close();
          }),
        ]);

        const messageResponses = await Promise.all(messagePromises);
        const response = mergeResponses(toResponses(connectResponse, ...sendResponses, ...messageResponses));
        if (response) {
          if (!(await onResponse(response, context))) {
            return false;
          }
        }
        client.close();
        return true;
      } catch (err) {
        (context.scriptConsole || log).error(context.request);
        if (isError(err)) {
          client.close(err);
        } else {
          client.close(new Error(toString(err)));
        }
        throw err;
      } finally {
        dispose?.();
        deleteVariableInContext('$client', context);
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
    return context.progress?.register(() => client.close(new Error('user cancellation')));
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
    if (!context.httpRegion.metaData.noStreamingLog && context.logStream) {
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
  const onRequest = context.httpFile.hooks.onRequest.merge(context.httpRegion.hooks.onRequest);
  if (context.progress) {
    onRequest.addInterceptor(createIsCanceledInterceptor(() => !!context.progress?.isCanceled()));
  }
  return context.request && (await onRequest.trigger(context.request, context)) !== HookCancel;
}

async function onStreaming(context: models.ProcessorContext) {
  const onStreaming = context.httpFile.hooks.onStreaming.merge(context.httpRegion.hooks.onStreaming);
  if (context.progress) {
    onStreaming.addInterceptor(createIsCanceledInterceptor(() => !!context.progress?.isCanceled()));
  }
  await onStreaming.trigger(context);
}

async function onResponse(response: models.HttpResponse, context: models.ProcessorContext) {
  const onResponse = context.httpRegion.hooks.onResponse.merge(context.httpFile.hooks.onResponse);
  if ((await onResponse.trigger(response, context)) === HookCancel) {
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
