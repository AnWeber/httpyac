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
  showProgressBar?: boolean
): Promise<boolean> {
  delete context.httpRegion.response;
  delete context.httpRegion.testResults;

  try {
    if (context.progress) {
      context.showProgressBar = showProgressBar;
    }
    report(context, `${context.httpRegion.symbol.name}`);

    let executeHook: Hook<[models.ProcessorContext], boolean, boolean[]> = context.httpRegion.hooks.execute;
    if (!isGlobalHttpRegion(context.httpRegion)) {
      executeHook = context.httpFile.hooks.execute.merge(executeHook);
    }

    const result = await executeHook.trigger(context);

    return result !== HookCancel && result.every(obj => !!obj);
  } finally {
    resetDependentRegions(context, context.httpFile, context.httpRegion);
  }
}

export async function logResponse(
  response: models.HttpResponse | undefined,
  context: models.ProcessorContext
): Promise<models.HttpResponse | undefined> {
  if (response) {
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
  return response;
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

interface ImportRegionDependentsEntry {
  refFile: models.HttpFile;
  refRegion: models.HttpRegion;
  dependents: Array<{
    depFile: models.HttpFile;
    depRegion: models.HttpRegion;
  }>;
}

interface HttpRegionDependenciesContext extends models.ProcessorContext {
  options: {
    refDependencies?: Array<ImportRegionDependentsEntry>;
  };
}

export function registerRegionDependent(
  context: models.ProcessorContext,
  refFile: models.HttpFile,
  refRegion: models.HttpRegion,
  dependentFile: models.HttpFile,
  dependentRegion: models.HttpRegion
): void {
  const depContext = context as HttpRegionDependenciesContext;
  depContext.options.refDependencies ||= [];
  let refDepEntry = depContext.options.refDependencies.find(e => e.refFile === refFile && e.refRegion === refRegion);
  if (!refDepEntry) {
    refDepEntry = { refFile, refRegion, dependents: [] };
    depContext.options.refDependencies.push(refDepEntry);
  }
  const depEntry = refDepEntry.dependents.find(d => d.depFile === dependentFile && d.depRegion === dependentRegion);
  if (!depEntry) {
    refDepEntry.dependents.push({
      depFile: dependentFile,
      depRegion: dependentRegion,
    });
  }
}

function resetDependentRegionsWithVisitor(
  context: HttpRegionDependenciesContext,
  refFile: models.HttpFile,
  refRegion: models.HttpRegion,
  visitedDependents: Array<{ depFile: models.HttpFile; depRegion: models.HttpRegion }>
): void {
  const refDepEntry = context.options.refDependencies?.find(e => e.refFile === refFile && e.refRegion === refRegion);
  if (!refDepEntry) return;
  const unvisitedDependents = refDepEntry.dependents.filter(
    d => !visitedDependents.find(v => v.depFile === d.depFile && v.depRegion === d.depRegion)
  );
  for (const { depFile, depRegion } of unvisitedDependents) {
    delete depRegion.response;
    delete depRegion.variablesPerEnv[toEnvironmentKey(depFile.activeEnvironment)];

    visitedDependents.push({ depFile, depRegion });
    resetDependentRegionsWithVisitor(context, depFile, depRegion, visitedDependents);
  }
}

export function resetDependentRegions(
  context: models.ProcessorContext,
  refFile: models.HttpFile,
  refRegion: models.HttpRegion
): void {
  resetDependentRegionsWithVisitor(context, refFile, refRegion, []);
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
