import { log, userInteractionProvider } from '../../../io';
import { Variables } from '../../../models';
import get from 'lodash/get';
import { URL } from 'url';

export const DEFAULT_CALLBACK_URI = 'http://localhost:3000/callback';
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
  scope: string;
  keepAlive: boolean;
  username?: string;
  password?: string;
  subjectIssuer?: string;
  useAuthorizationHeader: boolean;
  redirectUri: URL;
}

function getVariable(variables: Variables, variablePrefix: string, name: string): string {
  return (variables[`${variablePrefix}_${name}`] || get(variables, `${variablePrefix}.${name}`)) as string;
}

function getUrl(variables: Variables, variablePrefix: string, name: string, defaultUrl: string): URL {
  const url = getVariable(variables, variablePrefix, name);
  try {
    return new URL(url || defaultUrl);
  } catch {
    throw new Error(`Expected a valid URL, but received ${url}`);
  }
}

export function getOpenIdConfiguration(variablePrefix: string, variables: Variables): OpenIdConfiguration | false {
  if (variablePrefix) {
    const config: OpenIdConfiguration = {
      variablePrefix,
      authorizationEndpoint: getVariable(variables, variablePrefix, 'authorizationEndpoint'),
      deviceCodeEndpoint: getVariable(variables, variablePrefix, 'deviceCodeEndpoint'),
      tokenEndpoint: getVariable(variables, variablePrefix, 'tokenEndpoint'),
      clientId: getVariable(variables, variablePrefix, 'clientId'),
      clientSecret: getVariable(variables, variablePrefix, 'clientSecret'),
      responseType: getVariable(variables, variablePrefix, 'responseType'),
      responseMode: getVariable(variables, variablePrefix, 'responseMode'),
      audience: getVariable(variables, variablePrefix, 'audience'),
      scope: getVariable(variables, variablePrefix, 'scope'),
      username: getVariable(variables, variablePrefix, 'username'),
      password: getVariable(variables, variablePrefix, 'password'),
      subjectIssuer: getVariable(variables, variablePrefix, 'subjectIssuer'),
      redirectUri: getUrl(variables, variablePrefix, 'redirectUri', DEFAULT_CALLBACK_URI),
      keepAlive: ['true', '1', true].indexOf(getVariable(variables, variablePrefix, 'keepAlive')) < 0,
      useAuthorizationHeader:
        ['false', '0', false].indexOf(getVariable(variables, variablePrefix, 'useAuthorizationHeader')) < 0,
    };
    return config;
  }
  return false;
}

export function assertConfiguration(config: OpenIdConfiguration, keys: string[]): boolean {
  const missingKeys = [];
  for (const key of keys) {
    if (!Object.entries(config).some(([obj, value]) => obj === key && !!value)) {
      missingKeys.push(key);
    }
  }
  if (missingKeys.length > 0) {
    const message = `missing configuration: ${missingKeys.map(obj => `${config.variablePrefix}_${obj}`).join(', ')}`;
    log.error(message);
    userInteractionProvider.showErrorMessage?.(message);
    return false;
  }
  return true;
}
