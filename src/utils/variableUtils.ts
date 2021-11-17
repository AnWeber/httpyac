import * as models from '../models';
import { toAbsoluteFilename } from './fsUtils';
import { isString } from './stringUtils';
import * as io from '../io';
import { toEnvironmentKey } from './environmentUtils';
import { log } from '../io';

export function expandVariables(variables: models.Variables) : models.Variables {
  for (const [key, value] of Object.entries(variables)) {
    expandVariable(key, value, variables);
  }
  return variables;
}

export function expandVariable(key: string, value: unknown, variables: models.Variables) : unknown {
  if (value && isString(value)) {
    let result = value;
    let match: RegExpExecArray | null;
    const variableRegex = /\{{2}([a-zA-Z0-9_]+)\}{2}/gu;
    while ((match = variableRegex.exec(result)) !== null) {
      const [searchValue, variableName] = match;
      const val = expandVariable(variableName, variables[variableName], variables);
      result = result.replace(searchValue, `${val}`);
    }
    variables[key] = result;
  } else {
    variables[key] = value;
  }
  return value;
}

export async function replaceVariables(
  text: unknown,
  type: models.VariableType | string,
  context: models.ProcessorContext
): Promise<typeof models.HookCancel | unknown> {
  if (context.progress?.isCanceled?.()) {
    log.trace('processs canceled by user');
    return models.HookCancel;
  }
  return await context.httpFile.hooks.replaceVariable.trigger(text, type, context);
}

export async function replaceFilePath<T>(
  fileName: string, context:
    models.ProcessorContext,
  action: (path: models.PathLike) => Promise<T>
): Promise<T | undefined> {
  const file = await replaceVariables(fileName, models.VariableType.filePath, context);
  if (isString(file)) {
    const normalizedPath = await toAbsoluteFilename(file, io.fileProvider.dirname(context.httpFile.fileName));
    if (normalizedPath) {
      return await action(normalizedPath);
    }
    const message = `file not found: ${fileName}`;
    io.userInteractionProvider.showWarnMessage?.(message);
    io.log.warn(message);

  } else {
    const message = `file replace made file invalid: ${fileName} <> ${file}`;
    io.userInteractionProvider.showWarnMessage?.(message);
    io.log.warn(message);
  }
  return undefined;
}

export function setVariableInContext(variables: models.Variables, context: models.ProcessorContext) {
  Object.assign(context.variables, variables);
  const envKey = toEnvironmentKey(context.httpFile.activeEnvironment);
  if (!context.httpRegion.variablesPerEnv[envKey]) {
    context.httpRegion.variablesPerEnv[envKey] = {};
  }
  Object.assign(context.httpRegion.variablesPerEnv[envKey], variables);
}

export function unsetVariableInContext(variables: models.Variables, context: models.ProcessorContext) {
  const envKey = toEnvironmentKey(context.httpFile.activeEnvironment);
  const envVariables = context.httpRegion.variablesPerEnv[envKey];
  for (const key of Object.keys(variables)) {
    delete context.variables[key];
    if (envVariables) {
      delete envVariables[key];
    }
  }
}
