import { OpenIdConfiguration } from './openIdConfiguration';
import { HookCancel, HttpClient, HttpRequest, ProcessorContext, UserSession } from '../../../models';
import { cloneResponse, decodeJWT } from '../../../utils';
import { log } from '../../../io';

export interface OpenIdInformation extends UserSession{
  time: number;
  config: OpenIdConfiguration;
  accessToken: string;
  expiresIn: number;
  timeSkew: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
}


export async function requestOpenIdInformation(request: HttpRequest | false, options: {
  config: OpenIdConfiguration,
  httpClient: HttpClient,
  id: string,
  title: string,
  description: string,
}, context?: ProcessorContext): Promise<OpenIdInformation | false> {
  if (request) {
    const time = new Date().getTime();
    request.throwHttpErrors = true;
    const response = await options.httpClient(request, { showProgressBar: false });
    if (response) {

      if (context?.logResponse) {
        const clone = cloneResponse(response);
        if (await context.httpFile.hooks.responseLogging.trigger(clone, context) === HookCancel) {
          return false;
        }
        context.logResponse(clone);
      }
      if (response.statusCode === 200 && response.parsedBody) {
        return toOpenIdInformation(response.parsedBody, time, options);
      }
    }
  }
  return false;
}

export function toOpenIdInformation(jwtToken: unknown, time: number, context: {
  config: OpenIdConfiguration,
  id: string,
  title: string,
  description: string,
}): OpenIdInformation | false {
  if (isAuthToken(jwtToken)) {
    const parsedToken = decodeJWT(jwtToken.access_token);
    log.debug(JSON.stringify(parsedToken, null, 2));
    return {
      id: context.id,
      title: context.title,
      description: context.description,
      time,
      config: context.config,
      accessToken: jwtToken.access_token,
      expiresIn: jwtToken.expires_in,
      refreshToken: jwtToken.refresh_token,
      refreshExpiresIn: jwtToken.refresh_expires_in,
      timeSkew: parsedToken?.iat ? Math.floor(time / 1000) - parsedToken.iat : 0,
    };
  }
  return false;
}


export function isAuthToken(obj: unknown): obj is AuthToken {
  const guard = obj as AuthToken;
  return guard && !!guard.access_token && !!guard.expires_in;
}

interface AuthToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
}
