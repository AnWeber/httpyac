import { HttpRequest } from './httpRequest';
import { RequestLogger } from './logHandler';
import { ProcessorContext, Progress } from './processorContext';
import { UserSession } from './userSession';
import { Variables } from './variables';

export interface OpenIdConfiguration {
  variablePrefix: string;
  authorizationEndpoint?: string | null;
  tokenEndpoint?: string | null;
  deviceCodeEndpoint?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  responseType?: string | null;
  responseMode?: string | null;
  audience?: string | Array<string> | null;
  resource?: string | Array<string> | null;
  scope?: string | null;
  keepAlive?: boolean;
  username?: string | null;
  password?: string | null;
  proxy?: string | null;
  subjectIssuer?: string | null;
  useAuthorizationHeader?: boolean;
  useDeviceCodeClientSecret?: boolean;
  usePkce?: boolean;
  redirectUri?: URL;
  serverPort?: number;
  interceptRequest?: (request: HttpRequest, context: ProcessorContext) => Promise<void>;
}

export interface OpenIdInformation extends UserSession {
  time: number;
  config: OpenIdConfiguration;
  idToken?: string;
  accessToken: string;
  expiresIn?: number;
  timeSkew: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
  scope?: string;
}

export interface OpenIdContext {
  progress?: Progress | undefined;
  logResponse?: RequestLogger;
  variables: Variables;
}

export interface OpenIdSession extends Omit<UserSession, 'type'> {
  config: OpenIdConfiguration;
}
