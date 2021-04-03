
import { environmentStore } from '../environments';
import { httpYacApi } from '../httpYacApi';
import { log, scriptConsole } from '../logger';
import { HttpFileSendContext, HttpRegionSendContext, ProcessorContext, HttpFile, Variables, HttpResponse, HttpClient, HttpRegion } from '../models';


export function getRegionName(httpRegion: HttpRegion, defaultName: string = 'global') {
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

export async function sendHttpRegion(context: HttpRegionSendContext) {
  const variables = await getVariables(context.httpFile);
  if (!context.httpRegion.metaData.disabled) {
    if (await executeGlobalScripts(context.httpFile, variables, context.httpClient)) {
      return await processHttpRegionActions({variables, ...context}, true);
    }
  }
  return false;
}

export async function sendHttpFile(context: HttpFileSendContext) {
  const variables = await getVariables(context.httpFile);
  for (const httpRegion of context.httpFile.httpRegions) {
    if (!httpRegion.metaData.disabled) {
      await processHttpRegionActions({ httpRegion, variables , ...context });
    }
  }
}

export async function executeGlobalScripts(httpFile: HttpFile, variables: Variables, httpClient: HttpClient) {
  for (const httpRegion of httpFile.httpRegions) {
    if (!httpRegion.request && !httpRegion.metaData.disabled) {
      if (!await processHttpRegionActions({ httpRegion, httpFile, variables, httpClient })) {
        return false;
      }
    }
  }
  return true;
}

async function getVariables(httpFile: HttpFile): Promise<Record<string, any>> {
  const variables = Object.assign({
    log,
    console:scriptConsole,
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

export async function processHttpRegionActions(context: ProcessorContext, showProgressBar?: boolean) {

  for (const action of context.httpRegion.actions) {
    if (context.progress) {
      context.showProgressBar = showProgressBar;
    }
    context.progress?.report({ message: `${getRegionName(context.httpRegion)}` });
    if (!context.httpRegion.metaData.disabled) {
      if (!await action.processor(action.data, context)) {
        return false;
      }
      if (context.progress?.isCanceled()) {
        return false;
      }
    }
  }
  return true;
}

export function isHttpRegionSendContext(context: any): context is HttpRegionSendContext{
  return !!context.httpRegion;
}


