import { log } from '../io';
import * as models from '../models';
import { report } from './logUtils';
import { repeat, mergeResponses } from './repeatUtils';
import { setVariableInContext, deleteVariableInContext } from './variableUtils';
import { HookCancel } from 'hookpoint';

export function executeRequestClientFactory<T extends models.RequestClient>(
  requestClientFactory: (request: models.Request, context: models.ProcessorContext) => T
) {
  return async function (context: models.ProcessorContext) {
    const { request } = context;
    if (request) {
      const client = requestClientFactory(request, context);
      setVariableInContext(
        {
          $client: client,
        },
        context
      );
      const dispose = registerCancellation(client, context);
      try {
        if (!(await onRequest(context))) {
          return false;
        }
        const messagePromises: Array<Promise<models.HttpResponse | undefined>> = [];
        addProgressEvent(client, context);
        addMessageEvent(client, context, messagePromises);
        addMetaDataEvent(client, context, messagePromises);

        report(context, client.reportMessage);
        const responses = await Promise.all([
          repeat(() => client.connect(), context),
          onStreaming(context).then(response => {
            client.close();
            return response;
          }),
        ]);

        const messageResponses = await Promise.all(messagePromises);
        const response = mergeResponses(toResponses(responses, messageResponses));
        if (response) {
          if (!(await onResponse(response, context))) {
            return false;
          }
        }
        return true;
      } catch (err) {
        (context.scriptConsole || log).error(context.request);
        throw err;
      } finally {
        dispose?.();
        deleteVariableInContext('$client', context);
        client.close();
      }
    }
    return false;
  };
}

function toResponses(...obj: Array<Array<models.HttpResponse | undefined>>) {
  const result: Array<models.HttpResponse> = [];
  for (const resposens of obj) {
    for (const response of resposens) {
      if (response) {
        result.push(response);
      }
    }
  }
  return result;
}

function registerCancellation<T extends models.RequestClient>(client: T, context: models.ProcessorContext) {
  if (context.progress?.register) {
    return context.progress?.register(() => client.close());
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
      loadingPromises.push(context.logStream(type, response));
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
  return undefined;
}

async function onResponse(response: models.HttpResponse, context: models.ProcessorContext) {
  const onResponse = context.httpRegion.hooks.onResponse.merge(context.httpFile.hooks.onResponse);
  if (context.progress) {
    onResponse.addInterceptor(createIsCanceledInterceptor(() => !!context.progress?.isCanceled()));
  }
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
