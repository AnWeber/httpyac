import * as models from '../models';
import { toAbsoluteFilename } from './fsUtils';
import { isString } from './stringUtils';
import * as io from '../io';

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

export async function replaceVariables(text: unknown, type: models.VariableType | string, context: models.ProcessorContext): Promise<unknown> {
  return await context.httpFile.hooks.replaceVariable.trigger(text, type, context);
}


export async function replaceFilePath<T>(
  fileName: string, context:
    models.ProcessorContext,
  action: (path: models.PathLike) => Promise<T>
): Promise<T | undefined> {
  const file = await replaceVariables(fileName, models.VariableType.filePath, context);
  if (isString(file)) {
    const normalizedPath = await toAbsoluteFilename(file, context.httpFile.fileName);
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
