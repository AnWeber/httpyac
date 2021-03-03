import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import { OpenIdFlow } from './openIdFlow';
import { toQueryParams } from '../../../utils';
import { HttpClient, Progress } from '../../../models';
import open from 'open';
import { registerListener, unregisterListener } from './openIdHttpserver';

class AuthorizationCodeFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean{
    return ['authorization_code', 'code'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'authorizationEndpoint', 'clientId', 'clientSecret'])) {
      return `authorization_code_${config.clientId}_${config.tokenEndpoint}`;
    }
    return false;
  }

  async perform(config: OpenIdConfiguration, context: {httpClient: HttpClient, progress: Progress | undefined, cacheKey: string}): Promise<OpenIdInformation | false> {
    return new Promise<OpenIdInformation | false>(async (resolve, reject) => {
      const state = this.stateGenerator();
      try {
        const redirectUri = `http://localhost:${config.port}/callback`;
        const authUrl = `${config.authorizationEndpoint}${config.authorizationEndpoint.indexOf('?') > 0 ? '&' : '?'}${toQueryParams({
          client_id: config.clientId,
          scope: config.scope || 'openid',
          response_type: 'code',
          state,
          redirect_uri: redirectUri
        })}`;

        let unregisterProgress: (() => void) | undefined;
        if (context.progress) {
          unregisterProgress = context.progress.register(() => {
            unregisterListener(state);
            reject();
          });
        }

        registerListener({
          id: state,
          name: `authorization for ${config.clientId}: ${config.authorizationEndpoint}`,
          resolve: (params) => {
            if (params.code && params.state === state) {
              if (unregisterProgress) {
                unregisterProgress();
              }
              const openIdInformation = requestOpenIdInformation({
                url: config.tokenEndpoint,
                method: 'POST',
                headers: {
                  'authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
                  'content-type': 'application/x-www-form-urlencoded',
                },
                body: toQueryParams({
                  grant_type: 'authorization_code',
                  scope: config.scope,
                  code: params.code,
                  redirect_uri: redirectUri
                })
              }, {
                httpClient: context.httpClient,
                config: config,
                id: context.cacheKey,
                title: `authorization_code: ${config.clientId}`,
                description: config.tokenEndpoint
              });
              resolve(openIdInformation);
              return {
                valid: true,
                message: 'code received.',
                statusMessage: 'code and state valid. starting code exchange'
              };
            }

            return {
              valid: false,
              message: 'no code received',
              statusMessage: 'no code received'
            };
          },
          reject,
        });
        await open(authUrl);
      } catch (err) {
        unregisterListener(state);
        reject(err);
      }
    });
  }

  private stateGenerator(length: number = 30) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const result = [];
    for (var i = length; i > 0; --i){
      result.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    return result.join('');
  }
}


export const authorizationCodeFlow = new AuthorizationCodeFlow();