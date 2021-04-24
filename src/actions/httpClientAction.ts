import { ActionType, ProcessorContext, HttpRequest, HttpRequestBodyLine, HttpRegionAction } from '../models';
import { isString, isMimeTypeFormUrlEncoded } from '../utils';
import { log } from '../logger';
import encodeUrl from 'encodeurl';


export class HttpClientAction implements HttpRegionAction {
  type = ActionType.httpClient;

  async process(context: ProcessorContext): Promise<boolean> {
    const { httpRegion, httpClient, request } = context;
    if (request) {
      await this.initBody(request);
      request.proxy = httpRegion.metaData.proxy;
      request.followRedirect = !httpRegion.metaData.noRedirect;
      try {
        const response = await httpClient(request, context);
        if (response) {
          httpRegion.response = response;
          return true;
        }
      } catch (err) {
        log.error(request.url, request);
        throw err;
      }
    }
    return false;
  }

  private async initBody(request: HttpRequest) {
    if (isString(request.body) || Array.isArray(request.body)) {
      request.body = await this.normalizeBody(request.body);

      if (request.body && isString(request.body) && isMimeTypeFormUrlEncoded(request.contentType)) {
        request.body = encodeUrl(request.body);
      }
    }
  }

  private async normalizeBody(body: string | Array<HttpRequestBodyLine> | undefined) {
    if (isString(body)) {
      return body;
    }
    if (Array.isArray(body)) {
      const buffers: Array<Buffer> = [];
      for (const obj of body) {
        if (isString(obj)) {
          buffers.push(Buffer.from(obj));
        } else {
          buffers.push(await obj());
        }
      }
      return Buffer.concat(buffers);
    }
    return body;
  }

}
