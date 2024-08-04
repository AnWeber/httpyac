import { HookCancel } from 'hookpoint';

import { log } from '../../io';
import * as models from '../../models';
import { userSessionStore } from '../../store';
import * as utils from '../../utils';
import * as flows from './flow';
import { getOpenIdConfiguration, isOpenIdConfigurationEqual } from './openIdConfiguration';

export async function oauth2VariableReplacer(
  text: unknown,
  type: string,
  context: models.ProcessorContext
): Promise<unknown> {
  if (type.toLowerCase() === 'authorization' && utils.isString(text)) {
    const match = utils.OAuth2Regex.exec(text);
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
      utils.addTestResultToHttpRegion(context.httpRegion, {
        message: 'OAuth2 did not retrieve AccessToken',
        status: models.TestResultStatus.ERROR,
      });
      return HookCancel;
    }
  }
  return text;
}

export async function getOAuth2Response(
  flow: string,
  prefix: string | undefined,
  context: models.OpenIdContext,
  tokenExchangePrefix?: string
): Promise<models.OpenIdInformation | undefined> {
  const openIdFlow = getOpenIdFlow(flow);
  if (openIdFlow) {
    const config = getOpenIdConfiguration(prefix, context.variables);
    const cacheKey = openIdFlow.getCacheKey(config);

    const tokenExchangeConfig = getOpenIdConfiguration(tokenExchangePrefix, context.variables);
    let openIdInformation = getSessionOpenIdInformation(cacheKey, tokenExchangePrefix ? tokenExchangeConfig : config);
    userSessionStore.removeUserSession(cacheKey);
    if (openIdInformation) {
      log.trace(`openid refresh token flow used: ${cacheKey}`);
      openIdInformation = await flows.refreshTokenFlow.perform(openIdInformation, context);
    }
    if (!openIdInformation) {
      log.trace(`openid flow ${flow} used: ${cacheKey}`);
      openIdInformation = await openIdFlow.perform(config, context);
      if (openIdInformation && tokenExchangePrefix) {
        openIdInformation = await flows.TokenExchangeFlow.perform(tokenExchangeConfig, openIdInformation, context);
      }
    }
    if (openIdInformation) {
      log.trace(`openid flow ${flow} finished`);
      if (utils.isProcessorContext(context)) {
        utils.setVariableInContext({ oauth2Session: openIdInformation }, context);
      }
      userSessionStore.setUserSession(openIdInformation);
      keepAlive(cacheKey, context.variables);
      return openIdInformation;
    }
  }
  return undefined;
}

function getSessionOpenIdInformation(
  cacheKey: string,
  config: models.OpenIdConfiguration
): models.OpenIdInformation | false {
  const openIdInformation = userSessionStore.userSessions.find(obj => obj.id === cacheKey);
  if (utils.isOpenIdInformation(openIdInformation) && isOpenIdConfigurationEqual(openIdInformation.config, config)) {
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

function keepAlive(cacheKey: string, variables: models.Variables) {
  const openIdInformation = userSessionStore.userSessions.find(obj => obj.id === cacheKey);
  if (
    utils.isOpenIdInformation(openIdInformation) &&
    openIdInformation.expiresIn &&
    openIdInformation.refreshToken &&
    openIdInformation.config.keepAlive
  ) {
    const timeoutId = setTimeout(
      async () => {
        const result = await flows.refreshTokenFlow.perform(openIdInformation, { variables });
        if (result) {
          log.trace(`token ${result.title} refreshed`);
          userSessionStore.setUserSession(result);
          keepAlive(cacheKey, variables);
        }
      },
      (openIdInformation.expiresIn - openIdInformation.timeSkew) * 1000
    );
    openIdInformation.delete = () => clearTimeout(timeoutId);
  }
}
