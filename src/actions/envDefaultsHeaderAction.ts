import * as models from '../models';


export async function attachDefaultHeaders(request: models.Request, context: models.ProcessorContext) : Promise<models.Request> {
  if (request && context.config?.defaultHeaders) {
    context.progress?.report?.({
      message: 'set default request headers',
    });
    const defaultHeaders = context.config.defaultHeaders;
    if (!request.headers) {
      request.headers = {
        ...defaultHeaders
      };
    } else {
      for (const [key, value] of Object.entries(defaultHeaders)) {
        if (!request.headers[key]) {
          request.headers[key] = value;
        }
      }
    }
  }
  return request;
}
