import { Progress } from './processorContext';
import { RepeatOptions } from './repeatOptions';

export interface HttpClientContext{
  progress?: Progress | undefined,
  showProgressBar?: boolean;
  repeat?: RepeatOptions
}
