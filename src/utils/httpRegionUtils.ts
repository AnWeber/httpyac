
import { environmentStore } from '../environments';
import { httpYacApi } from '../httpYacApi';
import { log } from '../logger';
import { HttpFileSendContext, HttpRegionSendContext, ProcessorContext, HttpFile, Variables, HttpClient, HttpRegion } from '../models';


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
      return httpRegion.request.url.substring(index, indexQuery);
    }
  }
  return defaultName;
}

export async function sendHttpRegion(context: HttpRegionSendContext): Promise<boolean> {
  const variables = await getVariables(context.httpFile);
  if (!context.httpRegion.metaData.disabled) {
    if (await executeGlobalScripts(context.httpFile, variables, context.httpClient)) {
      return await processHttpRegionActions({variables, ...context}, true);
    }
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
    await processHttpRegionActions({ httpRegion, variables, ...context });
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

async function getVariables(httpFile: HttpFile): Promise<Record<string, unknown>> {
  const variables = Object.assign({
  },
    (await environmentStore.getVariables(httpFile.activeEnvironment)),
    ...(await Promise.all(
        httpYacApi.variableProviders
          .map(variableProvider => variableProvider.getVariables(httpFile.activeEnvironment, httpFile))
    ))
  );
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
    context.progress?.report({ message: `${getRegionName(context.httpRegion)}` });
    if (!context.httpRegion.metaData.disabled) {
      if (!await action.processor(action.data, context)) {
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

export function isHttpRegionSendContext(context: HttpRegionSendContext | HttpFileSendContext): context is HttpRegionSendContext{
  const guard = context as HttpRegionSendContext;
  return !!guard?.httpRegion;
}


