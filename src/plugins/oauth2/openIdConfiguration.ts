import { isEqualWith } from 'lodash';
import get from 'lodash/get';
import { URL } from 'url';

import { log } from '../../io';
import type * as models from '../../models';
import * as utils from '../../utils';

export const DEFAULT_CALLBACK_URI = 'http://localhost:3000/callback';
const DefaultOAuthVariablePrefix = 'oauth2';

function getVariableRaw(variables: models.Variables, name: string, variablePrefix: string): unknown {
  const variableName = `${variablePrefix}_${name}`;
  let varValue = variables[variableName];

  const caseInsensitiveVariables = Object.entries(variables)
    .filter(([key]) => key.toLowerCase() === variableName.toLowerCase())
    .map(([, value]) => value);
  if (caseInsensitiveVariables.length === 1) {
    return caseInsensitiveVariables.pop();
  }
  if (varValue === undefined) {
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

export function getOpenIdConfiguration(
  variablePrefix: string | undefined,
  variables: models.Variables
): models.OpenIdConfiguration {
  const getString = (name: string) => {
    const expandedValue = getVariableUnknown(variables, variablePrefix, name);
    return utils.ensureString(expandedValue);
  };

  const getArrayOrString = (name: string): string | Array<string> | null | undefined => {
    const expandedValue = getVariableUnknown(variables, variablePrefix, name);
    if (Array.isArray(expandedValue)) {
      return expandedValue.map(v => utils.ensureString(v)) as Array<string>;
    }
    return utils.ensureString(expandedValue);
  };

  const getUrl = (name: string, defaultUrl: string) => {
    const url = utils.ensureString(getVariableUnknown(variables, variablePrefix, name));
    try {
      return new URL(url || defaultUrl);
    } catch {
      throw new Error(`Expected a valid URL, but received ${url}`);
    }
  };

  const getFunction = (name: string) => {
    const expandedValue = getVariableUnknown(variables, variablePrefix, name);
    if (typeof expandedValue === 'function') {
      return expandedValue;
    }
    return undefined;
  };

  const getBoolean = (name: string, defaultValue = false) => {
    const expandedValue = getVariableUnknown(variables, variablePrefix, name);
    return utils.toBoolean(expandedValue, defaultValue);
  };
  const getNumber = (name: string, defaultValue = undefined) => {
    const expandedValue = getVariableUnknown(variables, variablePrefix, name);
    return utils.toNumber(expandedValue) || defaultValue;
  };

  const config: models.OpenIdConfiguration = {
    variablePrefix: variablePrefix || DefaultOAuthVariablePrefix,
    authorizationEndpoint: getString('authorizationEndpoint'),
    deviceCodeEndpoint: getString('deviceCodeEndpoint'),
    tokenEndpoint: getString('tokenEndpoint'),
    clientId: getString('clientId'),
    clientSecret: getString('clientSecret'),
    responseType: getString('responseType'),
    responseMode: getString('responseMode'),
    audience: getArrayOrString('audience'),
    scope: getString('scope'),
    resource: getArrayOrString('resource'),
    username: getString('username'),
    password: getString('password'),
    proxy: getString('proxy'),
    subjectIssuer: getString('subjectIssuer') || undefined,
    redirectUri: getUrl('redirectUri', DEFAULT_CALLBACK_URI),
    keepAlive: getBoolean('keepAlive', true),
    useAuthorizationHeader: getBoolean('useAuthorizationHeader', true),
    useDeviceCodeClientSecret: getBoolean('useDeviceCodeClientSecret'),
    usePkce: getBoolean('usePkce'),
    serverPort: getNumber('serverPort'),
    interceptRequest: getFunction('interceptRequest') as (
      request: models.HttpRequest,
      context: models.ProcessorContext
    ) => Promise<void>,
  };
  return config;
}

export function isOpenIdConfigurationEqual(
  config1: models.OpenIdConfiguration,
  config2: models.OpenIdConfiguration
): boolean {
  return isEqualWith(config1, config2, (prop1, prop2, key) => {
    const urlKeys: (keyof models.OpenIdConfiguration)[] = ['redirectUri'];
    if (key && urlKeys.some(obj => obj === key)) {
      return `${prop1}` === `${prop2}`;
    }
    return undefined;
  });
}

export function assertConfiguration(config: models.OpenIdConfiguration, keys: string[]): void {
  const missingKeys = [];
  for (const key of keys) {
    if (!Object.entries(config).some(([obj, value]) => obj === key && !!value)) {
      missingKeys.push(key);
    }
  }
  if (missingKeys.length > 0) {
    const message = `missing configuration: ${missingKeys.map(obj => `${config.variablePrefix}_${obj}`).join(', ')}`;
    log.error(message);
    throw new Error(message);
  }
}
