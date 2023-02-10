import * as models from '../../models';

export function provideAssertValueStatus(type: string, _value: string | undefined, response: models.HttpResponse) {
  if (type === 'status') {
    return response?.statusCode;
  }
  return false;
}
