import { ActionType, HttpRegionAction, ProcessorContext, VariableType, HookCancel } from '../models';


export class VariableAction implements HttpRegionAction {
  id = ActionType.variable;

  constructor(private readonly data: Record<string, string>) { }

  async process(context: ProcessorContext): Promise<boolean> {
    if (this.data) {
      for (const [key, value] of Object.entries(this.data)) {

        const result = await replaceVariables(value, VariableType.variable, context);
        if (result === HookCancel) {
          return false;
        }
        context.variables[key] = result;
      }
    }
    return true;
  }
}


export async function replaceVariables(text: unknown, type: VariableType | string, context: ProcessorContext): Promise<unknown> {
  return await context.httpFile.hooks.replaceVariable.trigger(text, type, context);
}
