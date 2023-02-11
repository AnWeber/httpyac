import * as io from '../../io';
import * as models from '../../models';

export async function provideAssertValueJavascript(
  type: string,
  value: string | undefined,
  response: models.HttpResponse,
  context: models.ProcessorContext
) {
  if (type === 'js' && value) {
    return await io.javascriptProvider.evalExpression(value, context, {
      response,
    });
  }
  if (type === 'body') {
    if (value) {
      return await io.javascriptProvider.evalExpression(`(response.parsedBody || response.body).${value}`, context, {
        response,
      });
    }
    return response.body;
  }
  return false;
}
