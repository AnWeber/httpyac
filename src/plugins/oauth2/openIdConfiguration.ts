import { log, userInteractionProvider } from '../../io';
import type * as models from '../../models';
import * as utils from '../../utils';
import { isEqualWith } from 'lodash';
import get from 'lodash/get';
import { URL } from 'url';

export const DEFAULT_CALLBACK_URI = 'http://localhost:3000/callback';
const DefaultOAuthVariablePrefix = 'oauth2';

function getVariable(variables: models.Variables, variablePrefix: string | undefined, name: string): string {
  const getter = (prefix: string) => variables[`${prefix}_${name}`] || get(variables, `${prefix}.${name}`);
  let value: unknown;
  if (variablePrefix) {
    value = getter(variablePrefix);
  }
  if (!value) {
    value = getter(DefaultOAuthVariablePrefix);
  }
  const expandedValue = utils.expandVariable(value, variables);
  if (utils.isString(expandedValue)) {
    return expandedValue;
  }
  return '';
}

function getUrl(
  variables: models.Variables,
  variablePrefix: string | undefined,
  name: string,
  defaultUrl: string
): URL {
  const url = getVariable(variables, variablePrefix, name);
  try {
    return new URL(url || defaultUrl);
  } catch {
    throw new Error(`Expected a valid URL, but received ${url}`);
  }
}

export function getOpenIdConfiguration(
  variablePrefix: string | undefined,
  variables: models.Variables
): models.OpenIdConfiguration {
  const config: models.OpenIdConfiguration = {
    variablePrefix: variablePrefix || DefaultOAuthVariablePrefix,
    authorizationEndpoint: getVariable(variables, variablePrefix, 'authorizationEndpoint'),
    deviceCodeEndpoint: getVariable(variables, variablePrefix, 'deviceCodeEndpoint'),
    tokenEndpoint: getVariable(variables, variablePrefix, 'tokenEndpoint'),
    clientId: getVariable(variables, variablePrefix, 'clientId'),
    clientSecret: getVariable(variables, variablePrefix, 'clientSecret'),
    responseType: getVariable(variables, variablePrefix, 'responseType'),
    responseMode: getVariable(variables, variablePrefix, 'responseMode'),
    audience: getVariable(variables, variablePrefix, 'audience'),
    scope: getVariable(variables, variablePrefix, 'scope'),
    resource: getVariable(variables, variablePrefix, 'resource'),
    username: getVariable(variables, variablePrefix, 'username'),
    password: getVariable(variables, variablePrefix, 'password'),
    subjectIssuer: getVariable(variables, variablePrefix, 'subjectIssuer'),
    redirectUri: getUrl(variables, variablePrefix, 'redirectUri', DEFAULT_CALLBACK_URI),
    keepAlive: ['true', '1', true].indexOf(getVariable(variables, variablePrefix, 'keepAlive')) < 0,
    useAuthorizationHeader:
      ['false', '0', false].indexOf(getVariable(variables, variablePrefix, 'useAuthorizationHeader')) < 0,
    useDeviceCodeClientSecret:
      ['true', '1', true].indexOf(getVariable(variables, variablePrefix, 'useDeviceCodeClientSecret')) >= 0,
    usePkce: ['true', '1', true].indexOf(getVariable(variables, variablePrefix, 'usePkce')) >= 0,
  };
  return config;
}

export function isOpenIdConfigurationEqual(
  config1: models.OpenIdConfiguration,
  config2: models.OpenIdConfiguration
): boolean {
  return isEqualWith(config1, config2, (prop1, prop2, key) => {
    const urlKeys: (keyof models.OpenIdConfiguration)[] = ['redirectUri'];
    const propname = key as keyof models.OpenIdConfiguration;
    if (key && urlKeys.includes(propname)) {
      return `${prop1}` === `${prop2}`;
    }
    return undefined;
  });
}

export function assertConfiguration(config: models.OpenIdConfiguration, keys: string[]): boolean {
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
