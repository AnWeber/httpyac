import { ProcessorContext, VariableReplacerType} from '../models';
import { httpYacApi } from '../httpYacApi';


export async function variableActionProcessor(data: Record<string, string>, context: ProcessorContext) : Promise<boolean> {
  let result = true;
  if (data) {
    context.cancelVariableReplacer = () => result = false;
    for (const [key, value] of Object.entries(data)) {
      if (result) {
        context.variables[key] = await replaceVariables(value, VariableReplacerType.variable, context);
      }
    }
  }
  return result;
}


export async function replaceVariables(text: string, type: VariableReplacerType | string, context: ProcessorContext): Promise<string | undefined> {
  let result: string | undefined = text;
  for (const replacer of httpYacApi.variableReplacers) {
    if (result) {
      result = await replacer(result, type, context);
    }
  }
  return result;
}