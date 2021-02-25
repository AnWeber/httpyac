
import { environmentStore } from '../environments';
import { httpYacApi } from '../httpYacApi';
import { log } from '../logger';
import { HttpFileSendContext, HttpRegionSendContext, ProcessorContext, HttpFile, Variables, HttpResponse, HttpClient } from '../models';
import {isString, toMultiLineString } from './stringUtils';

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
    console: log,
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


export function toConsoleOutput(response: HttpResponse, logTotalBody = false) {

  const result: Array<string> = [];
  if (response.request) {
    result.push(`${response.request.method} ${response.request.url}`);
    result.push('');
    result.push(...Object.entries(response.request.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .sort()
    );
    if (isString(response.request.body)) {
      result.push('');
      result.push(response.request.body);
    }
  }

  result.push('');
  result.push('------ response --------------------------------------------');
  result.push(`HTTP${response.httpVersion || ''} ${response.statusCode} - ${response.statusMessage}`);
  result.push('');
  result.push(...Object.entries(response.headers)
    .filter(([key]) => !key.startsWith(':'))
    .map(([key, value]) => `${key}: ${value}`)
    .sort()
  );

  if (isString(response.body)) {
    result.push('');
    let body = response.body;
    if (!logTotalBody) {
      const logLength = 100;
      body = body.substr(0, Math.min(body.length, logLength));
      if (response.body.length >= logLength) {
        body += `... (${response.body.length - logLength} characters  more)`;
      }
    }
    result.push(body);
  }
  result.push('');
  result.push('------------------------------------------------------------');
  return toMultiLineString(result);
}
