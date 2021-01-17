import { HttpRegionActionProcessor } from './httpRegionActionProcessor';

export interface HttpRegionAction<T = any> {
  data?: T;
  type: string;
  processor: HttpRegionActionProcessor<T>;
}