import * as models from '../../../models';

export function noRejectUnauthorizedMetaDataHandler(
  type: string,
  _value: string | undefined,
  context: models.ParserContext
) {
  if (type === 'noRejectUnauthorized') {
    context.httpRegion.hooks.onRequest.addHook('noRejectUnauthorized', async request => {
      request.noRejectUnauthorized = true;
    });
    return true;
  }
  return false;
}
