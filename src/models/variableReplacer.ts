import { ProcessorContext } from './processorContext';
import { VariableReplacerType } from './variableReplacerType';


export type VariableReplacer = (text: string, type: VariableReplacerType | string, context: ProcessorContext) => Promise<string>;