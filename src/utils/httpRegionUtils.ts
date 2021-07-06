import { environmentStore } from '../environments';
import { gotHttpClientFactory } from '../gotHttpClientFactory';
import { httpYacApi } from '../httpYacApi';
import { log } from '../logger';
import { HttpFileSendContext, HttpRegionSendContext, ProcessorContext, HttpFile, Variables, HttpClient, HttpRegion, HttpRegionsSendContext } from '../models';


export function getRegionName(httpRegion: HttpRegion, defaultName = 'global'): string {
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


export function initHttpClient(): HttpClient {
  const request = {
    ...environmentStore.environmentConfig?.request || {},
    proxy: environmentStore.environmentConfig?.proxy
  };
  return gotHttpClientFactory(request);
}

export async function sendHttpRegion(context: HttpRegionSendContext): Promise<boolean> {
  const variables = await getVariables(context.httpFile);
  if (!context.httpRegion.metaData.disabled) {
    const processorContext = {
      variables,
      ...context,
      httpClient: context.httpClient || initHttpClient()
    };
    if (await executeGlobalScripts(context.httpFile, variables, processorContext.httpClient)) {
      return await processHttpRegionActions(processorContext, true);
    }
  }
  return false;
}

export async function sendHttpRegions(context: HttpRegionsSendContext): Promise<boolean> {
  const variables = await getVariables(context.httpFile);
  const httpClient = context.httpClient || initHttpClient();
  if (await executeGlobalScripts(context.httpFile, variables, httpClient)) {
    for (const httpRegion of context.httpRegions) {
      if (!httpRegion.metaData.disabled) {
        const processorContext: ProcessorContext = {
          variables,
          httpRegion,
          ...context,
          httpClient
        };
        if (!await processHttpRegionActions(processorContext, false)) {
          return false;
        }
      }
    }
    return true;
  }
  return false;
}

export async function sendHttpFile(context: HttpFileSendContext): Promise<boolean> {
  const variables = await getVariables(context.httpFile);
  for (const httpRegion of context.httpFile.httpRegions) {
    if (httpRegion.metaData.disabled) {
      log.debug(`${getRegionName(httpRegion)} is disabled`);
      continue;
    }
    if (httpRegion.request && context.httpRegionPredicate && !context.httpRegionPredicate(httpRegion)) {
      log.debug(`${getRegionName(httpRegion)} disabled by predicate`);
      continue;
    }
    const processorContext = {
      variables,
      httpRegion,
      ...context,
      httpClient: context.httpClient || initHttpClient()
    };
    await processHttpRegionActions(processorContext);
  }
  return true;
}


export async function executeGlobalScripts(httpFile: HttpFile, variables: Variables, httpClient: HttpClient): Promise<boolean> {
  for (const httpRegion of httpFile.httpRegions) {
    if (!httpRegion.request && !httpRegion.metaData.disabled) {
      if (!await processHttpRegionActions({ httpRegion, httpFile, variables, httpClient })) {
        return false;
      }
    }
  }
  return true;
}

export async function getVariables(httpFile: HttpFile): Promise<Record<string, unknown>> {
  const variables = Object.assign({
  },
  (await environmentStore.getVariables(httpFile.activeEnvironment)),
  ...(await Promise.all(
    httpYacApi.variableProviders
      .map(variableProvider => variableProvider.getVariables(httpFile.activeEnvironment, httpFile))
  )));
  log.debug(variables);
  return variables;
}

export async function processHttpRegionActions(context: ProcessorContext, showProgressBar?: boolean): Promise<boolean> {
  delete context.httpRegion.response;
  delete context.httpRegion.testResults;

  for (const action of context.httpRegion.actions) {
    log.trace(`action ${action.type} executing`);
    if (context.progress) {
      context.showProgressBar = showProgressBar;
    }
    if (context.progress?.report) {
      context.progress.report({ message: `${getRegionName(context.httpRegion)}` });
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
  return true;
}

export function isHttpRegionSendContext(context: HttpRegionSendContext | HttpFileSendContext): context is HttpRegionSendContext {
  const guard = context as HttpRegionSendContext;
  return !!guard?.httpRegion;
}

export function isHttpRegionsSendContext(context: HttpRegionSendContext | HttpFileSendContext | HttpRegionsSendContext): context is HttpRegionsSendContext {
  const guard = context as HttpRegionsSendContext;
  return Array.isArray(guard?.httpRegions);
}
