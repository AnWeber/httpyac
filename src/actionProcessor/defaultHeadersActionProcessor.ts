import { ProcessorContext} from '../models';
import get from 'lodash/get';

export async function defaultHeadersActionProcessor(data: string, {httpRegion, variables}: ProcessorContext) {
  if (httpRegion.request && data && variables) {
    const headers = get(variables, data);
    Object.assign(httpRegion.request.headers, headers);
  }
  return true;
}
