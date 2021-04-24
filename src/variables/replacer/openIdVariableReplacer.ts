import { ProcessorContext, HttpClient, UserSession, VariableReplacer, VariableReplacerType } from '../../models';
import { userSessionStore } from '../../environments';
import * as oauth from './oauth';
import { log } from '../../logger';

export class OpenIdVariableReplacer implements VariableReplacer {
  type = VariableReplacerType.oauth2;
  async replace(text: string, type: string, context: ProcessorContext): Promise<string | undefined> {
    if (type.toLowerCase() === 'authorization' && text) {
      const match = /^\s*(openid|oauth2)\s+(?<flow>[^\s]*)\s+(?<variablePrefix>[^\s]*)\s*((token_exchange)\s+(?<tokenExchangePrefix>[^\s]*))?\s*$/iu.exec(text);
      if (match && match.groups && match.groups.flow && match.groups.variablePrefix) {

        const config = oauth.getOpenIdConfiguration(match.groups.variablePrefix, context.variables);
        const tokenExchangeConfig = oauth.getOpenIdConfiguration(match.groups.tokenExchangePrefix, context.variables);

        const openIdFlow = this.getOpenIdFlow(match.groups.flow);
        if (openIdFlow && config) {
          const cacheKey = openIdFlow.getCacheKey(config);
          if (cacheKey) {

            let openIdInformation = this.getOpenIdConfiguration(cacheKey, tokenExchangeConfig || config);
            userSessionStore.removeUserSession(cacheKey);
            if (openIdInformation) {
              log.trace(`openid refresh token flow used: ${cacheKey}`);
              openIdInformation = await oauth.refreshTokenFlow.perform(openIdInformation, context);
            }
            if (!openIdInformation) {
              log.trace(`openid flow ${match.groups.flow} used: ${cacheKey}`);
              openIdInformation = await openIdFlow.perform(config, {
                httpClient: context.httpClient,
                cacheKey,
                progress: context.progress
              });
              if (openIdInformation && tokenExchangeConfig) {
                openIdInformation = await oauth.TokenExchangeFlow.perform(tokenExchangeConfig, openIdInformation, context);
              }
            }
            if (openIdInformation) {
              log.trace(`openid flow ${match.groups.flow} finished`);
              userSessionStore.setUserSession(openIdInformation);
              this.keepAlive(cacheKey, context.httpClient);
              return `Bearer ${openIdInformation.accessToken}`;
            }
          }
          if (context.cancelVariableReplacer) {
            log.debug('flow found but no authorization, stop processing');
            context.cancelVariableReplacer();
          }
          return undefined;
        }
      }
    }
    return text;
  }

  private getOpenIdConfiguration(cacheKey: string, config: oauth.OpenIdConfiguration): oauth.OpenIdInformation | false {
    const openIdInformation = userSessionStore.userSessions.find(obj => obj.id === cacheKey);
    if (this.isOpenIdInformation(openIdInformation) && JSON.stringify(openIdInformation.config) === JSON.stringify(config)) {
      return openIdInformation;
    }
    return false;
  }

  private isOpenIdInformation(userSession: UserSession | undefined): userSession is oauth.OpenIdInformation {
    const guard = userSession as oauth.OpenIdInformation;
    return !!guard?.accessToken;
  }

  private getOpenIdFlow(flowType: string) {
    const openIdFlows: Array<oauth.OpenIdFlow> = [
      oauth.authorizationCodeFlow,
      oauth.clientCredentialsFlow,
      oauth.passwordFlow,
      oauth.implicitFlow
    ];
    return openIdFlows.find(flow => flow.supportsFlow(flowType));
  }

  private keepAlive(cacheKey: string, httpClient: HttpClient) {
    const openIdInformation = userSessionStore.userSessions.find(obj => obj.id === cacheKey);
    if (this.isOpenIdInformation(openIdInformation) && openIdInformation.refreshToken && openIdInformation.config.keepAlive) {
      const timeoutId = setTimeout(async () => {
        const result = await oauth.refreshTokenFlow.perform(openIdInformation, { httpClient });
        if (result) {
          log.info(`token ${result.title} refreshed`);
          userSessionStore.setUserSession(result);
          this.keepAlive(cacheKey, httpClient);
        }
      }, (openIdInformation.expiresIn - openIdInformation.timeSkew) * 1000);
      openIdInformation.logout = () => clearTimeout(timeoutId);
    }
  }
}
