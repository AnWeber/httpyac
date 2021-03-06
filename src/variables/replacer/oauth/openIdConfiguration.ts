import get from 'lodash/get';
import { popupService, log } from '../../../logger';

export interface OpenIdConfiguration{
  variablePrefix: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  responseType: string;
  responseMode?: string;
  audience?: string;
  scope: string;
  keepAlive: boolean;
  username?: string;
  password?: string;
  port?: string;
  subjectIssuer?: string;
  noLog?: boolean;
}

export function getOpenIdConfiguration(variablePrefix: string, variables: Record<string, any>) {
  if (variablePrefix) {
    const getVariable = (name: string) => variables[`${variablePrefix}_${name}`] || get(variables, `${variablePrefix}.${name}`);

    const config: OpenIdConfiguration = {
      variablePrefix,
      authorizationEndpoint: getVariable('authorizationEndpoint'),
      tokenEndpoint: getVariable('tokenEndpoint'),
      clientId: getVariable('clientId'),
      clientSecret: getVariable('clientSecret'),
      responseType: getVariable('responseType'),
      responseMode: getVariable('responseMode'),
      audience: getVariable('audience'),
      scope: getVariable('scope'),
      username: getVariable('username'),
      password: getVariable('password'),
      subjectIssuer: getVariable('subjectIssuer'),
      noLog: getVariable('noLog'),
      port: getVariable('port') || 3000,
      keepAlive: ['false', '0', false].indexOf(getVariable('keepAlive')) < 0,
    };
    return config;
  }
  return false;
}


export function assertConfiguration(config: OpenIdConfiguration, keys: string[]) {
  const missingKeys = [];
  for (const key of keys) {
    if (!Object.entries(config).some(([obj, value]) => obj === key && !!value)) {
      missingKeys.push(key);
    }
  }
  if (missingKeys.length > 0) {
    const message = `missing configuration: ${missingKeys.map(obj => `${config.variablePrefix}_${obj}`).join(', ')}`;
    log.error(message);
    popupService.error(message);
    log.error(message);
    return false;
  }
  return true;
}
