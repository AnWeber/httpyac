import { Progress } from './processorContext';

export interface HttpClientContext{
  progress?: Progress | undefined,
  showProgressBar?: boolean;
}