import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as models from '../../../models';
import * as utils from '../../../utils';
import { getRequestBody } from './requestBodyHttpRegionParser';

export class MultipartMixedInterceptor
  implements HookInterceptor<[models.getHttpLineGenerator, models.ParserContext], undefined>
{
  get id() {
    return 'multipart/mixed';
  }

  async beforeLoop(
    hookContext: HookTriggerContext<[models.getHttpLineGenerator, models.ParserContext], undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[1];

    if (context.httpRegion.request && utils.isMimeTypeMultiPartMixed(context.httpRegion.request.contentType)) {
      if (context.forceRegionDelimiter === undefined) {
        context.forceRegionDelimiter = true;
      } else if (context.forceRegionDelimiter) {
        const boundary = context.httpRegion.request.contentType?.boundary || '';
        const lastline = getRequestBody(context).rawBody.slice().pop();
        if (utils.isString(lastline) && lastline.includes(`--${boundary}--`)) {
          context.forceRegionDelimiter = false;
        }
      }
    }

    return true;
  }
}
