import * as models from '../models';
import { toEnvironmentKey } from './environmentUtils';
import { cloneResponse } from './requestUtils';

export function getDisplayName(httpRegion?: models.HttpRegion, defaultName = 'global'): string {
  if (httpRegion) {
    if (httpRegion.metaData.title) {
      return httpRegion.metaData.title;
    }
    if (httpRegion.metaData.name) {
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
  if (httpRegion.metaData.description) {
    return httpRegion.metaData.description;
  }
  if (httpRegion.request?.url) {
    return `${httpRegion.request.method} ${httpRegion.request.url}`;
  }
  return defaultName;
}

export async function processHttpRegionActions(
  context: models.ProcessorContext,
  showProgressBar?: boolean
): Promise<boolean> {
  delete context.httpRegion.response;
  delete context.httpRegion.testResults;

  const variables = context.variables;
  try {
    context.scriptConsole?.collectMessages?.();

    if (context.progress) {
      context.showProgressBar = showProgressBar;
    }
    if (context.progress?.report) {
      context.progress.report({ message: `${context.httpRegion.symbol.name}` });
    }

    context.variables = initRegionScopedVariables(context);

    const result = await context.httpRegion.hooks.execute.trigger(context);
    const processedHttpRegion = toProcessedHttpRegion(context);
    processedHttpRegion.response = await logResponse(processedHttpRegion?.response, context);
    if (context.processedHttpRegions && !isGlobalHttpRegion(context.httpRegion)) {
      context.processedHttpRegions.push(processedHttpRegion);
    }
    delete context.httpRegion.response;
    return result !== models.HookCancel && result.every(obj => !!obj);
  } finally {
    if (!context.httpRegion.metaData.noLog) {
      context.scriptConsole?.flush?.();
    }
    const newVariables = context.variables;
    context.variables = variables;
    autoShareNewVariables(newVariables, context);
  }
}
function initRegionScopedVariables(context: models.ProcessorContext) {
  const env = toEnvironmentKey(context.httpFile.activeEnvironment);

  let httpRegions = context.httpFile.httpRegions;
  if (context.config?.useRegionScopedVariables) {
    httpRegions = context.httpFile.httpRegions.filter(obj => isGlobalHttpRegion(obj));
  }

  const variables = Object.assign({}, context.variables, ...httpRegions.map(obj => obj.variablesPerEnv[env]));

  if (context.config?.useRegionScopedVariables) {
    Object.assign(
      variables,
      ...context.httpFile.httpRegions.filter(obj => isGlobalHttpRegion(obj)).map(obj => obj.variablesPerEnv[env])
    );
  } else {
    Object.assign(variables, ...context.httpFile.httpRegions.map(obj => obj.variablesPerEnv[env]));
  }
  return variables;
}

function autoShareNewVariables(variables: models.Variables, context: models.ProcessorContext) {
  for (const [key, value] of Object.entries(variables)) {
    if (!context.variables[key]) {
      context.variables[key] = value;
    }
  }
}

export async function logResponse(
  response: models.HttpResponse | undefined,
  context: models.ProcessorContext
): Promise<models.HttpResponse | undefined> {
  if (response) {
    const clone = cloneResponse(response);
    const fileResult = await context.httpFile.hooks.responseLogging.trigger(clone, context);
    if (fileResult === models.HookCancel) {
      return undefined;
    }
    const regionResult = await context.httpRegion.hooks.responseLogging.trigger(clone, context);
    if (regionResult === models.HookCancel) {
      return undefined;
    }
    if (!context.httpRegion.metaData.noLog && clone && context.logResponse) {
      await context.logResponse(clone, context.httpRegion);
    }
    return clone;
  }
  return response;
}

export async function executeGlobalScripts(context: {
  variables: models.Variables;
  httpClient: models.HttpClient;
  httpFile: models.HttpFile;
  options: Record<string, unknown>;
}): Promise<boolean> {
  for (const httpRegion of context.httpFile.httpRegions) {
    if (isGlobalHttpRegion(httpRegion) && !httpRegion.metaData.disabled) {
      if (
        !(await processHttpRegionActions({
          ...context,
          httpRegion,
        }))
      ) {
        return false;
      }
    }
  }
  return true;
}

export function toProcessedHttpRegion(context: models.ProcessorContext): models.ProcessedHttpRegion {
  return {
    metaData: context.httpRegion.metaData && {
      ...context.httpRegion.metaData,
    },
    symbol: context.httpRegion.symbol,
    testResults: context.httpRegion.testResults,
    request: context.httpRegion.request && {
      ...context.httpRegion.request,
    },
    response: context.httpRegion.response && cloneResponse(context.httpRegion.response),
  };
}

export function isGlobalHttpRegion(httpRegion: models.HttpRegion): boolean {
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

export function isProcessorContext(context: models.SendContext): context is models.ProcessorContext {
  const guard = context as models.ProcessorContext;
  return !!guard.httpRegion && !!guard.variables && !!guard.options;
}
