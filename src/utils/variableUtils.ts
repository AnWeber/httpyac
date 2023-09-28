import { HookCancel } from 'hookpoint';

import * as io from '../io';
import * as models from '../models';
import { toEnvironmentKey } from './environmentUtils';
import { toAbsoluteFilename } from './fsUtils';
import { isString } from './stringUtils';

export async function replaceVariables(
  text: unknown,
  type: models.VariableType | string,
  context: models.ProcessorContext
): Promise<typeof HookCancel | unknown> {
  if (context.progress?.isCanceled?.()) {
    io.log.trace('process canceled by user');
    return HookCancel;
  }
  return await context.httpFile.hooks.replaceVariable.trigger(text, type, context);
}

export async function replaceFilePath<T>(
  fileName: string,
  context: models.ProcessorContext,
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

export function expandVariable(value: unknown, variables: models.Variables): unknown {
  if (value && isString(value)) {
    let result = value;
    let match: RegExpExecArray | null;
    const variableRegex = /\{{2}\s*([a-zA-Z0-9_]+)\s*\}{2}/gu;
    while ((match = variableRegex.exec(result)) !== null) {
      const [searchValue, variableName] = match;
      const val = expandVariable(variables[variableName], variables);
      variables[variableName] = val;
      result = result.replace(searchValue, () => `${val}`);
    }
    return result;
  }
  return value;
}

export function setVariableInContext(variables: models.Variables, context: models.ProcessorContext) {
  if (variables) {
    const checkedVariables = cleanVariables(variables);
    Object.assign(context.variables, checkedVariables);
    const envKey = toEnvironmentKey(context.activeEnvironment);
    if (!context.httpRegion.variablesPerEnv[envKey]) {
      context.httpRegion.variablesPerEnv[envKey] = {};
    }
    Object.assign(context.httpRegion.variablesPerEnv[envKey], checkedVariables);
  }
}

export function cleanVariables(variables: models.Variables) {
  return Object.fromEntries(
    Object.entries(variables).filter(
      ([key]) => !io.javascriptProvider.isAllowedKeyword || io.javascriptProvider.isAllowedKeyword(key)
    )
  );
}

export function deleteVariableInContext(key: string, context: models.ProcessorContext) {
  delete context.variables[key];

  const envKey = toEnvironmentKey(context.activeEnvironment);
  if (context.httpRegion.variablesPerEnv[envKey]) {
    delete context.httpRegion.variablesPerEnv[envKey][key];
  }
}

export function unsetVariableInContext(variables: models.Variables, context: models.ProcessorContext) {
  const envKey = toEnvironmentKey(context.activeEnvironment);
  const envVariables = context.httpRegion.variablesPerEnv[envKey];
  for (const key of Object.keys(variables)) {
    delete context.variables[key];
    if (envVariables) {
      delete envVariables[key];
    }
  }
}
