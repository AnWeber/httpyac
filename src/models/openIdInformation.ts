import { RequestLogger } from './logHandler';
import { Progress } from './processorContext';
import { UserSession } from './userSession';
import { Variables } from './variables';

export interface OpenIdConfiguration {
  variablePrefix: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  deviceCodeEndpoint: string;
  clientId: string;
  clientSecret: string;
  responseType: string;
  responseMode?: string;
  audience?: string;
  resource?: string;
  scope: string;
  keepAlive: boolean;
  username?: string;
  password?: string;
  subjectIssuer?: string;
  useAuthorizationHeader: boolean;
  useDeviceCodeClientSecret?: boolean;
  usePkce: boolean;
  redirectUri: URL;
  serverPort?: number;
}

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
  progress?: Progress | undefined;
  logResponse?: RequestLogger;
  variables: Variables;
}

export interface OpenIdSession extends Omit<UserSession, 'type'> {
  config: OpenIdConfiguration;
}
