import { HookTriggerContext } from 'hookpoint';

import * as io from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';

export const jsonResponseInterceptor = {
  id: 'jsonResponseBody',
  beforeLoop: async function addXmlResponse(
    hookContext: HookTriggerContext<[models.HttpResponse, models.ProcessorContext], void>
  ): Promise<boolean> {
    const [response] = hookContext.args;
    if (response) {
      if (utils.isMimeTypeJSON(response.contentType) && utils.isString(response.body) && response.body.length > 0) {
        try {
          if (!response.parsedBody) {
            response.parsedBody = JSON.parse(response.body);
          }
          if (!response.prettyPrintBody) {
            response.prettyPrintBody = utils.stringifySafe(response.parsedBody, 2);
          }
        } catch (err) {
          io.log.warn('json parse error', response.body, err);
        }
      }
    }
    return true;
  },
};
