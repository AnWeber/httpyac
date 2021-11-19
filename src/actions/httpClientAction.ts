import * as models from '../models';
import * as utils from '../utils';

export class HttpClientAction implements models.HttpRegionAction {
  id = models.ActionType.httpClient;

  async process(context: models.ProcessorContext): Promise<boolean> {
    const { httpRegion, httpClient, request } = context;
    if (utils.isHttpRequest(request)) {
      request.proxy = httpRegion.metaData.proxy;
      if (httpRegion.metaData.noRedirect) {
        request.followRedirect = !httpRegion.metaData.noRedirect;
      }
      if (httpRegion.metaData.noRejectUnauthorized) {
        request.rejectUnauthorized = false;
      }
      return utils.triggerRequestResponseHooks(async () => await httpClient(request, context), context);
    }
    return false;
  }
}
