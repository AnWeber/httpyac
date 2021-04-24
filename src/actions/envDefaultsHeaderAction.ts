import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { environmentStore } from '../environments';

export class EnvDefaultHeadersAction implements HttpRegionAction {
  type = ActionType.envDefaultHeaders;

  async process({ request }: ProcessorContext) : Promise<boolean> {
    if (request && environmentStore?.environmentConfig?.defaultHeaders) {
      const defaultHeaders = environmentStore.environmentConfig.defaultHeaders;
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
