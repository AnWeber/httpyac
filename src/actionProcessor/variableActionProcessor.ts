import { ProcessorContext, VariableReplacerType} from '../models';
import { httpYacApi } from '../httpYacApi';


export async function variableActionProcessor(data: Record<string, string>, context: ProcessorContext) {
  let result = true;
  if (data) {
    context.cancelVariableReplacer = () => result = false;
    for (const [key, value] of Object.entries(data)) {
      if (result) {
        context.variables[key] = await httpYacApi.replaceVariables(value, VariableReplacerType.variable, context);
      }
    }
  }
  return result;
}
