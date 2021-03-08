import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdInformation, toOpenIdInformation, requestOpenIdInformation} from './openIdInformation';
import { OpenIdFlow } from './openIdFlow';
import { toQueryParams, stateGenerator } from '../../../utils';
import { HttpClient, Progress } from '../../../models';
import open from 'open';
import { registerListener, unregisterListener } from './openIdHttpserver';

class ImplicitFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean{
    return ['implicit', 'hybrid'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'authorizationEndpoint', 'clientId'])) {
      return `implicit_${config.clientId}_${config.tokenEndpoint}`;
    }
    return false;
  }

  async perform(config: OpenIdConfiguration, context: {httpClient: HttpClient, progress: Progress | undefined, cacheKey: string}): Promise<OpenIdInformation | false> {
    return new Promise<OpenIdInformation | false>(async (resolve, reject) => {
      const state = stateGenerator();
      try {
        const redirectUri = `http://localhost:${config.port}/callback`;
        const authUrl = `${config.authorizationEndpoint}${config.authorizationEndpoint.indexOf('?') > 0 ? '&' : '?'}${toQueryParams({
          client_id: config.clientId,
          scope: config.scope || 'openid',
          response_type: config.responseType || 'token',
          nonce: stateGenerator(),
          state,
          response_mode: config.responseMode,
          audience: config.audience,
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
            if (params.state === state) {

              if (params.code) {
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
                  title: `implicit: ${config.clientId}`,
                  description: `${config.variablePrefix} - ${config.tokenEndpoint}`
                });
                resolve(openIdInformation);
                return {
                  valid: true,
                  message: 'code received.',
                  statusMessage: 'code valid. starting code exchange'
                };
              }else if (params.access_token) {

                if (unregisterProgress) {
                  unregisterProgress();
                }
                const openIdInformation = toOpenIdInformation(params, (new Date()).getTime(), {
                  config: config,
                  id: context.cacheKey,
                  title: `implicit: ${config.clientId}`,
                  description: config.tokenEndpoint
                });
                resolve(openIdInformation);
                return {
                  valid: true,
                  message: 'access_token received.',
                  statusMessage: 'access_token and state valid.'
                };
              }
            }

            if (params.error_description) {
              return {
                valid: false,
                message: decodeURIComponent(params.error_description),
                statusMessage: 'no access_token received'
              };
            }
            return {
              valid: false,
              message: 'no access_token received',
              statusMessage: 'no access_token received'
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
}


export const implicitFlow = new ImplicitFlow();