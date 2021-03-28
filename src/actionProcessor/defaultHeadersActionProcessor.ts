import { ProcessorContext} from '../models';
import get from 'lodash/get';

export async function defaultHeadersActionProcessor(data: string, {request, variables}: ProcessorContext) {
  if (request && data && variables) {
    const headers = get(variables, data);
    request.headers = Object.assign(headers, request.headers);
  }
  return true;
}
