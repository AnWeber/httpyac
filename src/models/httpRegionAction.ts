import { HttpRegionActionProcessor } from './httpRegionActionProcessor';



// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface HttpRegionAction<T = any> {
  data?: T;
  type: string;
  processor: HttpRegionActionProcessor<T>;
}