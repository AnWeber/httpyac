
import { environmentStore } from '../environments';
import { httpYacApi } from '../httpYacApi';
import { log } from '../logger';
import { HttpFileSendContext, HttpRegionSendContext, ProcessorContext, HttpFile, Variables } from '../models';

export async function sendHttpRegion(context: HttpRegionSendContext) {
  const variables = await getVariables(context.httpFile);
  if (!context.httpRegion.metaData.disabled) {
    if (await executeGlobalScripts(context.httpFile, variables)) {
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

export async function executeGlobalScripts(httpFile: HttpFile, variables: Variables) {
  for (const httpRegion of httpFile.httpRegions) {
    if (!httpRegion.request && !httpRegion.metaData.disabled) {
      if (!await processHttpRegionActions({ httpRegion, httpFile, variables })) {
        return false;
      }
    }
  }
  return true;
}

async function getVariables(httpFile: HttpFile): Promise<Record<string, any>> {
  const variables = Object.assign({
    log,
  },
    (await environmentStore.getVariables(httpFile.activeEnvironment)),
    ...(await Promise.all(
        httpYacApi.variableProviders
          .map(variableProvider => variableProvider.getVariables(httpFile.activeEnvironment, httpFile))
    ))
  );
  log.trace(variables);
  return variables;
}

export async function processHttpRegionActions(context: ProcessorContext, showProgressBar?: boolean) {

  for (const action of context.httpRegion.actions) {
    if (context.progress) {
      context.progress.showProgressBar = showProgressBar;
    }
    context.progress?.report({ message: `${context.httpRegion.metaData.name || context.httpRegion.request?.url || 'global' }` });
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