import { ActionType, HttpRegionAction, ProcessorContext } from '../models';

export class EnvDefaultHeadersAction implements HttpRegionAction {
  type = ActionType.envDefaultHeaders;

  async process({ request, config }: ProcessorContext) : Promise<boolean> {
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
    return true;
  }
}
