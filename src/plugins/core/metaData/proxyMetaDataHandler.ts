import * as models from '../../../models';

export function proxyMetaDataHandler(type: string, value: string | undefined, context: models.ParserContext) {
  if (type === 'proxy') {
    context.httpRegion.hooks.onRequest.addHook('proxy', async request => {
      request.proxy = value;
    });
    return true;
  }
  return false;
}
