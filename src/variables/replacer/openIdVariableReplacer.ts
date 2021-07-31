import { ProcessorContext, HttpClient, UserSession, HookCancel } from '../../models';
import { userSessionStore } from '../../store';
import * as oauth from './oauth';
import { ParserRegex } from '../../parser';
import { log } from '../../io';


export async function openIdVariableReplacer(text: string, type: string, context: ProcessorContext): Promise<string | undefined | typeof HookCancel> {
  if (type.toLowerCase() === 'authorization' && text) {
    const match = ParserRegex.auth.oauth2.exec(text);
    if (match && match.groups && match.groups.flow && match.groups.variablePrefix) {

      const config = oauth.getOpenIdConfiguration(match.groups.variablePrefix, context.variables);
      const tokenExchangeConfig = oauth.getOpenIdConfiguration(match.groups.tokenExchangePrefix, context.variables);

      const openIdFlow = getOpenIdFlow(match.groups.flow);
      if (openIdFlow && config) {
        const cacheKey = openIdFlow.getCacheKey(config);
        if (cacheKey) {

          let openIdInformation = getOpenIdConfiguration(cacheKey, tokenExchangeConfig || config);
          userSessionStore.removeUserSession(cacheKey);
          if (openIdInformation) {
            log.debug(`openid refresh token flow used: ${cacheKey}`);
            openIdInformation = await oauth.refreshTokenFlow.perform(openIdInformation, { httpClient: context.httpClient }, context);
          }
          if (!openIdInformation) {
            log.debug(`openid flow ${match.groups.flow} used: ${cacheKey}`);
            openIdInformation = await openIdFlow.perform(config, {
              cacheKey,
              progress: context.progress,
            }, context);
            if (openIdInformation && tokenExchangeConfig) {
              openIdInformation = await oauth.TokenExchangeFlow.perform(tokenExchangeConfig, openIdInformation, context);
            }
          }
          if (openIdInformation) {
            log.debug(`openid flow ${match.groups.flow} finished`);
            userSessionStore.setUserSession(openIdInformation);
            keepAlive(cacheKey, context.httpClient);
            return `Bearer ${openIdInformation.accessToken}`;
          }
        }
        return HookCancel;
      }
    }
  }
  return text;
}

function getOpenIdConfiguration(cacheKey: string, config: oauth.OpenIdConfiguration): oauth.OpenIdInformation | false {
  const openIdInformation = userSessionStore.userSessions.find(obj => obj.id === cacheKey);
  if (isOpenIdInformation(openIdInformation) && JSON.stringify(openIdInformation.config) === JSON.stringify(config)) {
    return openIdInformation;
  }
  return false;
}

function isOpenIdInformation(userSession: UserSession | undefined): userSession is oauth.OpenIdInformation {
  const guard = userSession as oauth.OpenIdInformation;
  return !!guard?.accessToken;
}

function getOpenIdFlow(flowType: string) {
  const openIdFlows: Array<oauth.OpenIdFlow> = [
    oauth.authorizationCodeFlow,
    oauth.clientCredentialsFlow,
    oauth.passwordFlow,
    oauth.implicitFlow
  ];
  return openIdFlows.find(flow => flow.supportsFlow(flowType));
}

function keepAlive(cacheKey: string, httpClient: HttpClient) {
  const openIdInformation = userSessionStore.userSessions.find(obj => obj.id === cacheKey);
  if (isOpenIdInformation(openIdInformation) && openIdInformation.refreshToken && openIdInformation.config.keepAlive) {
    const timeoutId = setTimeout(async () => {
      const result = await oauth.refreshTokenFlow.perform(openIdInformation, { httpClient });
      if (result) {
        log.debug(`token ${result.title} refreshed`);
        userSessionStore.setUserSession(result);
        keepAlive(cacheKey, httpClient);
      }
    }, (openIdInformation.expiresIn - openIdInformation.timeSkew) * 1000);
    openIdInformation.logout = () => clearTimeout(timeoutId);
  }
}
