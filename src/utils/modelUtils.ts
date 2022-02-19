import * as models from '../models';

export function isOpenIdInformation(
  userSession: models.UserSession | undefined
): userSession is models.OpenIdInformation {
  const guard = userSession as models.OpenIdInformation;
  return !!guard?.accessToken;
}

export function isProcessorContext(context: unknown): context is models.ProcessorContext {
  const guard = context as models.ProcessorContext;
  return !!guard?.httpRegion && !!guard?.httpFile && !!guard?.variables && !!guard?.config;
}
