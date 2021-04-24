import { ProcessorContext } from './processorContext';
import { VariableReplacerType } from './variableReplacerType';


export interface VariableReplacer {
  type: string;
  replace: (text: string, type: VariableReplacerType | string, context: ProcessorContext) => Promise<string | undefined>;
}
