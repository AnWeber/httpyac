import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';
import { parseFromString } from './nodeUtils';
import { HookTriggerContext } from 'hookpoint';
import { EOL } from 'os';
import { formatXml } from 'xmldom-format';

export const xmlResponseInterceptor = {
  id: 'xmlResponseBody',
  beforeLoop: async function addXmlResponse(
    hookContext: HookTriggerContext<[models.HttpResponse, models.ProcessorContext], void>
  ): Promise<boolean> {
    const [response] = hookContext.args;
    if (response) {
      if (
        utils.isMimeTypeXml(response.contentType) &&
        !response.prettyPrintBody &&
        utils.isString(response.body) &&
        response.body.length > 0
      ) {
        const document = parseFromString(response.body, response.contentType?.mimeType);
        response.parsedBody = document;
        try {
          response.prettyPrintBody = formatXml(document, {
            eol: EOL,
            indentation: '  ',
            useWhitespaceInAutoClosingNode: true,
          });
        } catch (err) {
          io.log.warn('xml format error', response.body, err);
        }
      }
    }
    return true;
  },
};
