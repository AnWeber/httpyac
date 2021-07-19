import { Variables } from '../models';
import { isString } from './stringUtils';


export function expandVariables(variables: Variables) : Variables {
  for (const [key, value] of Object.entries(variables)) {
    expandVariable(key, value, variables);
  }
  return variables;
}

export function expandVariable(key: string, value: unknown, variables: Variables) : unknown {
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
