import { log } from '../../io';
import * as models from '../../models';
import { ParserRegex } from '../../parser';
import { userSessionStore } from '../../store';
import * as utils from '../../utils';
import * as flows from './flow';
import { getOpenIdConfiguration, OpenIdConfiguration } from './openIdConfiguration';
import { HookCancel } from 'hookpoint';

export async function oauth2VariableReplacer(
  text: unknown,
  type: string,
  context: models.ProcessorContext
): Promise<unknown> {
  if (type.toLowerCase() === 'authorization' && utils.isString(text)) {
    const match = ParserRegex.auth.oauth2.exec(text);
    if (match && match.groups) {
      const flow = match.groups.flow || 'client_credentials';
      utils.report(context, `get OAuth2 Authorization (${flow})`);

      const openIdInformation = await getOAuth2Response(
        flow,
        match.groups.variablePrefix,
        context,
        match.groups.tokenExchangePrefix
      );

      if (openIdInformation) {
        return `Bearer ${openIdInformation.accessToken}`;
      }
      return HookCancel;
    }
  }
  return text;
}

export async function getOAuth2Response(
  flow: string,
  prefix: string | undefined,
  context: flows.OpenIdFlowContext,
  tokenExchangePrefix?: string
) {
  const config = getOpenIdConfiguration(prefix || 'oauth2', context.variables);
  const tokenExchangeConfig = getOpenIdConfiguration(tokenExchangePrefix, context.variables);
  const openIdFlow = getOpenIdFlow(flow);
  if (openIdFlow && config) {
    const cacheKey = openIdFlow.getCacheKey(config);
    if (cacheKey) {
      let openIdInformation = getSessionOpenIdInformation(cacheKey, tokenExchangeConfig || config);
      userSessionStore.removeUserSession(cacheKey);
      if (openIdInformation) {
        log.trace(`openid refresh token flow used: ${cacheKey}`);
        openIdInformation = await flows.refreshTokenFlow.perform(openIdInformation, context);
      }
      if (!openIdInformation) {
        log.trace(`openid flow ${flow} used: ${cacheKey}`);
        openIdInformation = await openIdFlow.perform(config, context);
        if (openIdInformation && tokenExchangeConfig) {
          openIdInformation = await flows.TokenExchangeFlow.perform(tokenExchangeConfig, openIdInformation, context);
        }
      }
      if (openIdInformation) {
        log.trace(`openid flow ${flow} finished`);
        context.variables.oauth2Session = openIdInformation;
        userSessionStore.setUserSession(openIdInformation);
        keepAlive(cacheKey, context.httpClient, context.variables);
        return openIdInformation;
      }
    }
  }
  return undefined;
}

function getSessionOpenIdInformation(cacheKey: string, config: OpenIdConfiguration): models.OpenIdInformation | false {
  const openIdInformation = userSessionStore.userSessions.find(obj => obj.id === cacheKey);
  if (
    models.isOpenIdInformation(openIdInformation) &&
    JSON.stringify(openIdInformation.config) === JSON.stringify(config)
  ) {
    return openIdInformation;
  }
  return false;
}

function getOpenIdFlow(flowType: string) {
  const openIdFlows: Array<flows.OpenIdFlow> = [
    flows.authorizationCodeFlow,
    flows.clientCredentialsFlow,
    flows.deviceCodeFlow,
    flows.passwordFlow,
    flows.implicitFlow,
  ];
  return openIdFlows.find(flow => flow.supportsFlow(flowType));
}

function keepAlive(cacheKey: string, httpClient: models.HttpClient, variables: models.Variables) {
  const openIdInformation = userSessionStore.userSessions.find(obj => obj.id === cacheKey);
  if (
    models.isOpenIdInformation(openIdInformation) &&
    openIdInformation.refreshToken &&
    openIdInformation.config.keepAlive
  ) {
    const timeoutId = setTimeout(async () => {
      const result = await flows.refreshTokenFlow.perform(openIdInformation, { httpClient, variables });
      if (result) {
        log.trace(`token ${result.title} refreshed`);
        userSessionStore.setUserSession(result);
        keepAlive(cacheKey, httpClient, variables);
      }
    }, (openIdInformation.expiresIn - openIdInformation.timeSkew) * 1000);
    openIdInformation.delete = () => clearTimeout(timeoutId);
  }
}
