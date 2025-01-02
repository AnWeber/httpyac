import './registerPlugins';

import { HookCancel } from 'hookpoint';

import { log } from './io';
import * as models from './models';
import { getEnvironmentConfig } from './store';
import * as utils from './utils';

/**
 * process one httpRegion of HttpFile
 * @param httpFile httpFile
 */
export async function send(context: models.SendContext): Promise<boolean> {
  let result = false;
  if (utils.isHttpRegionSendContext(context)) {
    result = await sendHttpRegion(context);
  } else if (utils.isHttpRegionsSendContext(context)) {
    result = await sendHttpRegions(context);
  } else {
    result = await sendHttpFile(context);
  }
  return result;
}

async function sendHttpRegion(context: models.HttpRegionSendContext): Promise<boolean> {
  const processorContext = await createEmptyProcessorContext(context);
  if (await utils.executeGlobalScripts(processorContext)) {
    return await context.httpRegion.execute(processorContext, true);
  }
  return false;
}

async function sendHttpRegions(context: models.HttpRegionsSendContext): Promise<boolean> {
  const processorContext = await createEmptyProcessorContext(context);
  if (await utils.executeGlobalScripts(processorContext)) {
    if (context.progress) {
      context.progress.divider = context.httpRegions.length;
    }
    let status = true;
    for (const httpRegion of context.httpRegions) {
      const result = await httpRegion.execute(processorContext, true);
      status = status && result;
    }
    return status;
  }
  return false;
}

async function sendHttpFile(context: models.HttpFileSendContext): Promise<boolean> {
  const httpRegions: Array<models.HttpRegion> = [];
  for (const httpRegion of context.httpFile.httpRegions) {
    if (context.httpRegionPredicate && !context.httpRegionPredicate(httpRegion)) {
      log.debug(`${httpRegion.symbol.name} disabled by predicate`);
    } else if (!httpRegion.isGlobal()) {
      httpRegions.push(httpRegion);
    }
  }
  return await sendHttpRegions({ ...context, httpRegions });
}

export async function createEmptyProcessorContext<T extends models.VariableProviderContext>(
  context: T
): Promise<
  T & {
    variables: models.Variables;
    options: Record<string, unknown>;
  }
> {
  return Object.assign(context, {
    variables: await getVariables(context),
    options: {},
  });
}

export async function getVariables(context: models.VariableProviderContext): Promise<Record<string, unknown>> {
  context.config = await getEnvironmentConfig(context.config, context.httpFile);

  const vars = await context.httpFile.hooks.provideVariables.trigger(context.activeEnvironment, context);
  if (vars === HookCancel) {
    return context.variables || {};
  }
  const contextVars = {
    ...context.variables,
  };
  const variables = Object.assign(
    context.variables || {},
    ...vars.map(variables => utils.cleanVariables(variables)),
    contextVars
  );
  log.debug('current environment variables', variables);
  return variables;
}

export async function getEnvironments(context: models.VariableProviderContext): Promise<Array<string>> {
  context.config = await getEnvironmentConfig(context.config, context.httpFile);

  const result = await context.httpFile.hooks.provideEnvironments.trigger(context);
  if (result !== HookCancel && result.length > 0) {
    return result
      .reduce((prev, current) => {
        for (const cur of current) {
          if (prev.indexOf(cur) < 0) {
            prev.push(cur);
          }
        }
        return prev;
      }, [] as Array<string>)
      .sort();
  }
  return [];
}
