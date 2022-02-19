import { log } from '../../../io';
import * as io from '../../../io';
import type * as models from '../../../models';
import * as utils from '../../../utils';

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

    if (request.headers && options.config.useAuthorizationHeader) {
      request.headers.authorization = `Basic ${Buffer.from(
        `${options.config.clientId}:${options.config.clientSecret}`
      ).toString('base64')}`;
    } else {
      request.body = `${request.body}&${utils.toQueryParams({
        client_id: options.config.clientId,
        client_secret: options.config.clientSecret,
      })}`;
    }

    const response = await io.httpClientProvider.exchange?.(
      {
        options: {},
        ...request,
      },
      { showProgressBar: false }
    );
    if (response) {
      if (utils.isProcessorContext(context)) {
        await utils.logResponse(response, context);
      }
      if (response.statusCode < 400 && utils.isString(response.body)) {
        return toOpenIdInformation(JSON.parse(response.body), time, options);
      }
    }
  }
  return false;
}

export function toOpenIdInformation(
  jwtToken: unknown,
  time: number,
  session: models.OpenIdSession
): models.OpenIdInformation | false {
  if (isAuthToken(jwtToken)) {
    const parsedToken = utils.decodeJWT(jwtToken.access_token);
    if (parsedToken) {
      log.debug(JSON.stringify(parsedToken, null, 2));
    }
    return {
      ...session,
      type: 'OAuth2',
      time,
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
