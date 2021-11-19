import { initHttpClient, log } from './io';
import * as models from './models';
import { getEnviromentConfig } from './store';
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
  if (!context.httpRegion.metaData.disabled) {
    const processorContext = await createEmptyProcessorContext(context);
    if (await utils.executeGlobalScripts(processorContext)) {
      return await utils.processHttpRegionActions(processorContext, true);
    }
  }
  return false;
}

async function sendHttpRegions(context: models.HttpRegionsSendContext): Promise<boolean> {
  const processorContext = await createEmptyProcessorContext(context);
  if (await utils.executeGlobalScripts(processorContext)) {
    for (const httpRegion of context.httpRegions) {
      if (!httpRegion.metaData.disabled) {
        const regionProcessorContext: models.ProcessorContext = {
          ...processorContext,
          httpRegion,
        };
        if (!(await utils.processHttpRegionActions(regionProcessorContext, false))) {
          return false;
        }
      }
    }
    return true;
  }
  return false;
}

async function sendHttpFile(context: models.HttpFileSendContext): Promise<boolean> {
  const processorContext = await createEmptyProcessorContext(context);
  for (const httpRegion of context.httpFile.httpRegions) {
    if (httpRegion.metaData.disabled) {
      log.debug(`${httpRegion.symbol.name} is disabled`);
      continue;
    }
    if (httpRegion.request && context.httpRegionPredicate && !context.httpRegionPredicate(httpRegion)) {
      log.debug(`${httpRegion.symbol.name} disabled by predicate`);
      continue;
    }
    const regionProcessorContext = {
      ...processorContext,
      httpRegion,
    };
    await utils.processHttpRegionActions(regionProcessorContext);
  }
  return true;
}

async function createEmptyProcessorContext<T extends models.VariableProviderContext>(
  context: T
): Promise<
  T & {
    variables: models.Variables;
    httpClient: models.HttpClient;
    options: Record<string, unknown>;
  }
> {
  return Object.assign(context, {
    variables: await getVariables(context),
    httpClient: initHttpClient(context),
    options: {},
  });
}

export async function getVariables(context: models.VariableProviderContext): Promise<Record<string, unknown>> {
  context.config = await getEnviromentConfig(context.config, context.httpFile?.rootDir);

  const vars = await context.httpFile.hooks.provideVariables.trigger(context.httpFile.activeEnvironment, context);
  if (vars === models.HookCancel) {
    return {};
  }
  const variables = Object.assign({}, ...vars, context.variables);
  log.debug(variables);
  return variables;
}

export async function getEnvironments(context: models.VariableProviderContext): Promise<Array<string>> {
  context.config = await getEnviromentConfig(context.config, context.httpFile?.rootDir);

  const result = await context.httpFile.hooks.provideEnvironments.trigger(context);
  if (result !== models.HookCancel && result.length > 0) {
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
