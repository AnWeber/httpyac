import { ProcessorContext, VariableReplacerType} from '../models';
import { httpYacApi } from '../httpYacApi';


export async function variableActionProcessor(data: Record<string, string>, context: ProcessorContext) {
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      context.variables[key] = await httpYacApi.replaceVariables(value, VariableReplacerType.variable, context);
    }
  }
  return true;
}
