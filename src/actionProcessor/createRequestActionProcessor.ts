import { ProcessorContext} from '../models';
import cloneDeep = require('lodash/cloneDeep');

export async function createRequestActionProcessor(data: unknown, context: ProcessorContext) {
  if (context.httpRegion.request) {
    context.request = cloneDeep(context.httpRegion.request);
  }
  return true;
}
