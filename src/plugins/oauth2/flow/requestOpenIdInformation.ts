import { log } from '../../../io';
import * as io from '../../../io';
import type * as models from '../../../models';
import * as utils from '../../../utils';
import { addClientCertificateForUrl } from '../../http';

export async function requestOpenIdInformation(
  request: models.HttpClientRequest | false,
  options: models.OpenIdSession,
  context: models.OpenIdContext
): Promise<models.OpenIdInformation | false> {
  if (request) {
    const time = new Date().getTime();

    if (!request.headers) {
      request.headers = {
        'content-type': 'application/x-www-form-urlencoded',
      };
    }

    if (
      request.headers &&
      options.config.useAuthorizationHeader &&
      options.config.clientId &&
      options.config.clientSecret
    ) {
      request.headers.authorization = `Basic ${Buffer.from(
        `${options.config.clientId}:${options.config.clientSecret}`
      ).toString('base64')}`;
    } else {
      request.body = `${request.body}&${utils.toQueryParams({
        client_id: options.config.clientId,
        client_secret: options.config.clientSecret,
      })}`;
    }
    await addConfigRequestOptions(request, options.config, context);

    const response = await io.httpClientProvider.exchange?.(
      {
        options: {},
        ...request,
      },
      { isMainContext: false }
    );
    if (response) {
      response.tags = ['auth', 'oauth2', 'automatic'];
      if (utils.isProcessorContext(context)) {
        response.tags = response.tags ?? [];
        response.tags.push('httpRegion');
        await utils.logResponse(response, context);
      }
      if (response.statusCode < 400 && utils.isString(response.body)) {
        return toOpenIdInformation(JSON.parse(response.body), time, options);
      }
    }
  }
  return false;
}

export async function addConfigRequestOptions(
  request: models.HttpClientRequest,
  config: models.OpenIdConfiguration,
  context: models.OpenIdContext
) {
  if (utils.isProcessorContext(context)) {
    request.proxy = config.proxy || undefined;
    if (context.config?.request?.rejectUnauthorized !== undefined) {
      request.noRejectUnauthorized = !utils.toBoolean(context.config?.request?.rejectUnauthorized);
    }

    await addClientCertificateForUrl(request.url, request, context);

    if (config.interceptRequest) {
      await config.interceptRequest(request, context);
    }
  }
}

export function toOpenIdInformation(
  jwtToken: unknown,
  time: number,
  session: models.OpenIdSession
): models.OpenIdInformation | false {
  if (isAuthToken(jwtToken)) {
    const parsedToken = utils.decodeJWT(jwtToken.access_token);
    if (parsedToken) {
      log.debug(utils.stringifySafe(parsedToken, 2));
    }
    return {
      ...session,
      type: 'OAuth2',
      time,
      accessToken: jwtToken.access_token,
      expiresIn: jwtToken.expires_in ?? parsedToken?.exp,
      refreshToken: jwtToken.refresh_token,
      refreshExpiresIn: jwtToken.refresh_expires_in,
      timeSkew: parsedToken?.iat ? Math.floor(time / 1000) - parsedToken.iat : 0,
      idToken: jwtToken.id_token,
      scope: jwtToken.scope,
    };
  }
  return false;
}

export function isAuthToken(obj: unknown): obj is AuthToken {
  const guard = obj as AuthToken;
  return guard && !!guard.access_token;
}

interface AuthToken {
  id_token?: string;
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
}
