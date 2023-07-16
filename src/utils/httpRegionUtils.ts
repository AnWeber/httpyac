import * as models from '../models';
import { createResponseProxy } from './requestClientUtils';
import { cloneResponse } from './requestUtils';
import { isString } from './stringUtils';
import { HookCancel } from 'hookpoint';

export function getDisplayName(httpRegion?: models.HttpRegion, defaultName = 'global'): string {
  if (httpRegion) {
    if (isString(httpRegion.metaData.title)) {
      return httpRegion.metaData.title;
    }
    if (isString(httpRegion.metaData.name)) {
      return httpRegion.metaData.name;
    }
    if (httpRegion.request?.url) {
      let indexQuery = httpRegion.request.url.indexOf('?');
      if (indexQuery < 0) {
        indexQuery = httpRegion.request.url.length;
      }
      const line =
        httpRegion.symbol.children?.find?.(obj => obj.kind === models.HttpSymbolKind.requestLine)?.startLine ||
        httpRegion.symbol.startLine;
      return `${httpRegion.request.method} ${httpRegion.request.url.slice(0, indexQuery)} (line: ${line + 1})`;
    }
  }
  return defaultName;
}

export function getRegionDescription(httpRegion: models.HttpRegion, defaultName = '-'): string {
  if (isString(httpRegion.metaData.description)) {
    return httpRegion.metaData.description;
  }
  if (httpRegion.request?.url) {
    return `${httpRegion.request.method} ${httpRegion.request.url}`;
  }
  return defaultName;
}

export async function logResponse(
  response: models.HttpResponse,
  context: models.ProcessorContext
): Promise<models.HttpResponse | undefined> {
  const clone = cloneResponse(response);
  const regionResult = await context.hooks.responseLogging.trigger(createResponseProxy(clone), context);
  if (regionResult === HookCancel) {
    return undefined;
  }
  if (!context.httpRegion.metaData.noLog && clone && context.logResponse) {
    await context.logResponse(clone, context.httpRegion);
  }
  return clone;
}

export async function executeGlobalScripts(context: {
  variables: models.Variables;
  httpFile: models.HttpFile;
  options: Record<string, unknown>;
}): Promise<boolean> {
  for (const httpRegion of context.httpFile.globalHttpRegions) {
    if (!(await httpRegion.execute(context))) {
      return false;
    }
  }
  return true;
}

export function addHttpFileRequestClientHooks(
  requestClientHooks: models.RequestClientHooks,
  httpFile: models.HttpFile
): models.RequestClientHooks {
  return {
    onRequest: httpFile.hooks.onRequest.merge(
      ...httpFile.globalHttpRegions.map(obj => obj.hooks.onRequest),
      requestClientHooks.onRequest
    ) as models.OnRequestHook,
    onResponse: httpFile.hooks.onResponse.merge(
      requestClientHooks.onResponse,
      ...httpFile.globalHttpRegions.map(obj => obj.hooks.onResponse)
    ) as models.OnResponseHook,
    onStreaming: httpFile.hooks.onStreaming.merge(
      requestClientHooks.onStreaming,
      ...httpFile.globalHttpRegions.map(obj => obj.hooks.onStreaming)
    ) as models.OnStreaming,
    responseLogging: httpFile.hooks.responseLogging.merge(
      requestClientHooks.responseLogging,
      ...httpFile.globalHttpRegions.map(obj => obj.hooks.responseLogging)
    ) as models.ResponseLoggingHook,
  };
}
