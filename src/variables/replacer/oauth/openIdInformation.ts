import { OpenIdConfiguration } from './openIdConfiguration';
import { log, logRequest } from '../../../logger';
import { HttpClient, HttpRequest, UserSession } from '../../../models';
import { decodeJWT, isString } from '../../../utils';

export interface OpenIdInformation extends UserSession{
  time: number;
  config: OpenIdConfiguration;
  accessToken: string;
  expiresIn: number;
  timeSkew: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
}


export async function requestOpenIdInformation(request: HttpRequest | false,context: {
  config: OpenIdConfiguration,
  httpClient: HttpClient,
  id: string,
  title: string,
  description: string,
}): Promise<OpenIdInformation | false>{
  if (request) {
    const time = new Date().getTime();
    const response = await context.httpClient(request, { showProgressBar: false });
    if (response) {

      if (!context.config.noLog) {
        logRequest.info(response);
      }
      if (response.statusCode === 200 && isString(response.body)) {
        const jwtToken = JSON.parse(response.body);
        return toOpenIdInformation(jwtToken, time, context);
      }
    }
  }
  return false;
}

export function toOpenIdInformation(jwtToken: Record<string, any>, time: number, context: {
  config: OpenIdConfiguration,
  id: string,
  title: string,
  description: string,
}): OpenIdInformation | false {
  const parsedToken = decodeJWT(jwtToken.access_token);
  if (!context.config.noLog) {
    log.info(JSON.stringify(parsedToken, null, 2));
  }
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