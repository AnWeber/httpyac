import { HookTriggerContext } from 'hookpoint';
import { EOL } from 'os';
import { formatXml } from 'xmldom-format';

import * as models from '../../models';
import * as utils from '../../utils';
import { parseFromString } from './nodeUtils';

export const xmlResponseInterceptor = {
  id: 'xmlResponseBody',
  beforeLoop: async function addXmlResponse(
    hookContext: HookTriggerContext<[models.HttpResponse, models.ProcessorContext], void>
  ): Promise<boolean> {
    const [response] = hookContext.args;
    if (response) {
      if (
        (utils.isMimeTypeXml(response.contentType) || utils.isMimeTypeHtml(response.contentType)) &&
        !response.prettyPrintBody &&
        utils.isString(response.body) &&
        response.body.length > 0
      ) {
        const document = parseFromString(
          response.body,
          utils.isMimeTypeHtml(response.contentType) ? 'text/html' : 'text/xml'
        );
        if (document) {
          response.parsedBody = document;
          response.prettyPrintBody = formatXml(document, {
            eol: EOL,
            indentation: '  ',
            useWhitespaceInAutoClosingNode: true,
          });
        }
      }
    }
    return true;
  },
};
