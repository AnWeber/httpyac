import { Progress, RepeatOrder } from './processorContext';

export interface HttpClientContext{
  progress?: Progress | undefined,
  showProgressBar?: boolean;
  repeat?: {
    type: RepeatOrder;
    count: number;
  }
}