import * as models from '../models';
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
  const onResponseLogging = context.httpRegion.hooks.responseLogging.merge(context.httpFile.hooks.responseLogging);
  const regionResult = await onResponseLogging.trigger(clone, context);
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
  for (const httpRegion of context.httpFile.httpRegions) {
    if (httpRegion.isGlobal() && !httpRegion.metaData.disabled) {
      if (!(await httpRegion.execute(context))) {
        return false;
      }
    }
  }
  return true;
}
