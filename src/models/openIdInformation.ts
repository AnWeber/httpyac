import { OpenIdConfiguration } from '../plugins/oauth2/openIdConfiguration';
import { HttpClient } from './httpClient';
import { UserSession } from './userSession';

export interface OpenIdInformation extends UserSession {
  time: number;
  config: OpenIdConfiguration;
  accessToken: string;
  expiresIn: number;
  timeSkew: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
}

export interface OpenIdContext {
  httpClient: HttpClient;
}

export interface OpenIdSession extends Omit<UserSession, 'type'> {
  config: OpenIdConfiguration;
}

export function isOpenIdInformation(userSession: UserSession | undefined): userSession is OpenIdInformation {
  const guard = userSession as OpenIdInformation;
  return !!guard?.accessToken;
}
