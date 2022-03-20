import { log, userInteractionProvider } from '../../io';
import type * as models from '../../models';
import * as utils from '../../utils';
import { isEqualWith } from 'lodash';
import get from 'lodash/get';
import { URL } from 'url';

export const DEFAULT_CALLBACK_URI = 'http://localhost:3000/callback';
const DefaultOAuthVariablePrefix = 'oauth2';

function getVariableRaw(variables: models.Variables, name: string, variablePrefix: string): unknown {
  let varValue = variables[`${variablePrefix}_${name}`];
  if (typeof varValue === 'undefined' || varValue === null) {
    varValue = get(variables, `${variablePrefix}.${name}`);
  }
  return varValue;
}

function getVariableUnknown(variables: models.Variables, variablePrefix: string | undefined, name: string): unknown {
  const getter = (prefix: string) => getVariableRaw(variables, name, prefix);
  let value: unknown;
  if (variablePrefix) {
    value = getter(variablePrefix);
  }
  if (value === undefined) {
    value = getter(DefaultOAuthVariablePrefix);
  }
  const expandedValue = utils.expandVariable(value, variables);
  return expandedValue;
}

function getString(variables: models.Variables, variablePrefix: string | undefined, name: string): string {
  const expandedValue = getVariableUnknown(variables, variablePrefix, name);
  return utils.ensureString(expandedValue);
}

function getBooleanLike(
  variables: models.Variables,
  variablePrefix: string | undefined,
  name: string,
  defaultValue = false
): boolean {
  const expandedValue = getVariableUnknown(variables, variablePrefix, name);
  return utils.toBoolean(expandedValue, defaultValue);
}

function getUrl(
  variables: models.Variables,
  variablePrefix: string | undefined,
  name: string,
  defaultUrl: string
): URL {
  const url = getString(variables, variablePrefix, name);
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
    authorizationEndpoint: getString(variables, variablePrefix, 'authorizationEndpoint'),
    deviceCodeEndpoint: getString(variables, variablePrefix, 'deviceCodeEndpoint'),
    tokenEndpoint: getString(variables, variablePrefix, 'tokenEndpoint'),
    clientId: getString(variables, variablePrefix, 'clientId'),
    clientSecret: getString(variables, variablePrefix, 'clientSecret'),
    responseType: getString(variables, variablePrefix, 'responseType'),
    responseMode: getString(variables, variablePrefix, 'responseMode'),
    audience: getString(variables, variablePrefix, 'audience'),
    scope: getString(variables, variablePrefix, 'scope'),
    resource: getString(variables, variablePrefix, 'resource'),
    username: getString(variables, variablePrefix, 'username'),
    password: getString(variables, variablePrefix, 'password'),
    subjectIssuer: getString(variables, variablePrefix, 'subjectIssuer'),
    redirectUri: getUrl(variables, variablePrefix, 'redirectUri', DEFAULT_CALLBACK_URI),
    keepAlive: getBooleanLike(variables, variablePrefix, 'keepAlive', true),
    useAuthorizationHeader: getBooleanLike(variables, variablePrefix, 'useAuthorizationHeader', true),
    useDeviceCodeClientSecret: getBooleanLike(variables, variablePrefix, 'useDeviceCodeClientSecret'),
    usePkce: getBooleanLike(variables, variablePrefix, 'usePkce'),
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
