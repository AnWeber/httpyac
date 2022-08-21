import * as io from '../io';
import * as models from '../models';
import { toEnvironmentKey } from './environmentUtils';
import { report } from './logUtils';
import { cloneResponse } from './requestUtils';
import { isString } from './stringUtils';
import { HookCancel, Hook } from 'hookpoint';

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

export async function processHttpRegionActions(
  context: models.ProcessorContext,
  isMainContext?: boolean
): Promise<boolean> {
  delete context.httpRegion.response;
  delete context.httpRegion.testResults;

  context.isMainContext = isMainContext;

  report(context, `${context.httpRegion.symbol.name}`);

  let executeHook: Hook<[models.ProcessorContext], boolean, boolean[]> = context.httpRegion.hooks.execute;
  if (!isGlobalHttpRegion(context.httpRegion)) {
    executeHook = context.httpFile.hooks.execute.merge(executeHook);
    for (const globalRegion of context.httpFile.httpRegions.filter(isGlobalHttpRegion)) {
      registerRegionDependent(context, context.httpFile, globalRegion, context.httpFile, context.httpRegion);
    }
  }

  const result = await executeHook.trigger(context);
  if (!isGlobalHttpRegion(context.httpRegion)) {
    resetDependentRegions(context, context.httpFile, context.httpRegion);
  }
  return result !== HookCancel && result.every(obj => !!obj);
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

export function registerRegionDependent(
  _context: object,
  refFile: models.HttpFile,
  refRegion: models.HttpRegion,
  dependentFile: models.HttpFile,
  dependentRegion: models.HttpRegion
): void {
  const envKey = toEnvironmentKey(refFile.activeEnvironment);
  let refDependents = refRegion.dependentsPerEnv[envKey];
  if (typeof refDependents === 'undefined') {
    refDependents = refRegion.dependentsPerEnv[envKey] = [];
  }
  const depEntry = refDependents.find(d => d.httpFile === dependentFile && d.httpRegion === dependentRegion);
  if (!depEntry) {
    refDependents.push({
      httpFile: dependentFile,
      httpRegion: dependentRegion,
    });
  }
}

function resetDependentRegionsWithVisitor(
  refFile: models.HttpFile,
  refRegion: models.HttpRegion,
  visitedDependents: Array<{ httpFile: models.HttpFile; httpRegion: models.HttpRegion }>
): void {
  const envKey = toEnvironmentKey(refFile.activeEnvironment);
  let refDependents = refRegion.dependentsPerEnv[envKey];
  if (typeof refDependents === 'undefined') {
    refDependents = refRegion.dependentsPerEnv[envKey] = [];
  }
  const unvisitedDependents = refDependents.filter(
    d => !visitedDependents.find(v => v.httpFile === d.httpFile && v.httpRegion === d.httpRegion)
  );
  for (const { httpFile, httpRegion } of unvisitedDependents) {
    io.log.trace(
      `resetting '${httpFile.fileName}:${getDisplayName(httpRegion)}': dependent of '${
        refFile.fileName
      }:${getDisplayName(refRegion)}'`
    );
    delete httpRegion.response;
    delete httpRegion.variablesPerEnv[toEnvironmentKey(httpFile.activeEnvironment)];

    visitedDependents.push({ httpFile, httpRegion });
    resetDependentRegionsWithVisitor(httpFile, httpRegion, visitedDependents);
  }
}

export function resetDependentRegions(_context: object, refFile: models.HttpFile, refRegion: models.HttpRegion): void {
  resetDependentRegionsWithVisitor(refFile, refRegion, []);
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
