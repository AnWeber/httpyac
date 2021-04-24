import get from 'lodash/get';
import { popupService, log } from '../../../logger';
import { Variables } from '../../../models';

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
  subjectIssuer?: string;
}

function getVariable(variables: Variables, variablePrefix: string, name: string): string {
  return `${variables[`${variablePrefix}_${name}`] || get(variables, `${variablePrefix}.${name}`)}`;
}

export function getOpenIdConfiguration(variablePrefix: string, variables: Variables) : OpenIdConfiguration | false {
  if (variablePrefix) {
    const config: OpenIdConfiguration = {
      variablePrefix,
      authorizationEndpoint: getVariable(variables, variablePrefix, 'authorizationEndpoint'),
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
      keepAlive: ['false', '0', false].indexOf(getVariable(variables, variablePrefix, 'keepAlive')) < 0,
    };
    return config;
  }
  return false;
}


export function assertConfiguration(config: OpenIdConfiguration, keys: string[]) : boolean {
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
