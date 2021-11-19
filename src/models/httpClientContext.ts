import { HttpRegion } from './httpRegion';
import { RequestLogger } from './logHandler';
import { Progress } from './processorContext';
import { RepeatOptions } from './repeatOptions';

export interface HttpClientContext {
  progress?: Progress | undefined;
  showProgressBar?: boolean;
  repeat?: RepeatOptions;
  httpRegion?: HttpRegion;
  logResponse?: RequestLogger;
}
