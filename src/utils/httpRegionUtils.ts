import { log } from '../io';
import * as models from '../models';


export function getDisplayName(httpRegion: models.HttpRegion, defaultName = 'global'): string {
  if (httpRegion.metaData.title) {
    return httpRegion.metaData.title;
  }
  if (httpRegion.metaData.name) {
    return httpRegion.metaData.name;
  }
  if (httpRegion.request?.url) {
    const index = httpRegion.request.url.indexOf('/');
    if (index >= 0) {
      let indexQuery = httpRegion.request.url.indexOf('?');
      if (indexQuery < 0) {
        indexQuery = httpRegion.request.url.length;
      }
      return httpRegion.request.url.slice(index, indexQuery);
    }
  }
  return defaultName;
}

export function getRegionDescription(httpRegion: models.HttpRegion, defaultName = '-'): string {
  if (httpRegion.metaData.description) {
    return httpRegion.metaData.description;
  }
  if (httpRegion.request?.url) {
    return `${httpRegion.request.method} ${httpRegion.request.url}`;
  }
  return defaultName;
}


export async function processHttpRegionActions(context: models.ProcessorContext, showProgressBar?: boolean): Promise<boolean> {
  delete context.httpRegion.response;
  delete context.httpRegion.testResults;

  try {
    context.scriptConsole?.collectMessages?.();
    if (context.processedHttpRegions && !isGlobalHttpRegion(context.httpRegion)) {
      context.processedHttpRegions.push(context.httpRegion);
    }
    for (const action of context.httpRegion.actions) {
      log.trace(`action ${action.type} executing`);
      if (context.progress) {
        context.showProgressBar = showProgressBar;
      }
      if (context.progress?.report) {
        context.progress.report({ message: `${getDisplayName(context.httpRegion)}` });
      }
      if (!context.httpRegion.metaData.disabled) {
        if (!await action.process(context)) {
          log.trace(`processs canceled by action ${action.type}`);
          return false;
        }
        if (context.progress?.isCanceled()) {
          log.trace(`processs canceled by progress after ${action.type}`);
          return false;
        }
      }
    }
    if (!context.httpRegion.metaData.noLog
      && context.httpRegion.response
      && context.logResponse) {
      context.logResponse(context.httpRegion.response, context.httpRegion);
    }
    return true;
  } finally {
    if (!context.httpRegion.metaData.noLog) {
      context.scriptConsole?.flush?.();
    }
  }
}


export async function executeGlobalScripts(context: {
  variables: models.Variables,
  httpClient: models.HttpClient,
  httpFile: models.HttpFile
}): Promise<boolean> {
  for (const httpRegion of context.httpFile.httpRegions) {
    if (isGlobalHttpRegion(httpRegion) && !httpRegion.metaData.disabled) {
      if (!await processHttpRegionActions({
        ...context,
        httpRegion,
      })) {
        return false;
      }
    }
  }
  return true;
}


export function isGlobalHttpRegion(httpRegion: models.HttpRegion) : boolean {
  return !(httpRegion.request || httpRegion.metaData.name);
}


export function isHttpRegionSendContext(context: models.SendContext): context is models.HttpRegionSendContext {
  const guard = context as models.HttpRegionSendContext;
  return !!guard?.httpRegion;
}

export function isHttpRegionsSendContext(context: models.SendContext): context is models.HttpRegionsSendContext {
  const guard = context as models.HttpRegionsSendContext;
  return Array.isArray(guard?.httpRegions);
}
