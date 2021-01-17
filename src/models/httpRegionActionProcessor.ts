import { ProcessorContext } from './processorContext';

/**
 * @returns false if processing cancelled
 */
export type HttpRegionActionProcessor<T> = (data: T, context: ProcessorContext) => Promise<boolean>;