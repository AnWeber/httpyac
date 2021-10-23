import * as models from '../models';


export async function attachDefaultHeaders(request: models.Request, { config }: models.ProcessorContext) : Promise<models.Request> {
  if (request && config?.defaultHeaders) {
    const defaultHeaders = config.defaultHeaders;
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
