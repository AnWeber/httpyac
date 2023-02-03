import * as models from '../../../models';

export function noRedirectMetaDataHandler(type: string, _value: string | undefined, context: models.ParserContext) {
  if (type === 'noRedirect') {
    context.httpRegion.hooks.onRequest.addHook('noRedirect', async request => {
      request.noRedirect = true;
    });
    return true;
  }
  return false;
}
