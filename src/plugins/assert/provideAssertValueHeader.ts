import * as models from '../../models';
import * as utils from '../../utils';

export function provideAssertValueHeader(type: string, value: string | undefined, response: models.HttpResponse) {
  if (type === 'header' && value) {
    return utils.getHeader(response.headers, value);
  }
  return false;
}
