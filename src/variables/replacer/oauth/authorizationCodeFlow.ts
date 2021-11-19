import * as utils from '../../../utils';
import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdFlow, OpenIdFlowContext } from './openIdFlow';
import { registerListener, unregisterListener } from './openIdHttpserver';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import open from 'open';

class AuthorizationCodeFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['authorization_code', 'code'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'authorizationEndpoint', 'clientId', 'clientSecret'])) {
      return `authorization_code_${config.clientId}_${config.tokenEndpoint}`;
    }
    return false;
  }

  async perform(config: OpenIdConfiguration, context: OpenIdFlowContext): Promise<OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      return new Promise<OpenIdInformation | false>((resolve, reject) => {
        const state = utils.stateGenerator();
        try {
          utils.report(context, 'execute OAuth2 authorization_code flow');
          const redirectUri = 'http://localhost:3000/callback';
          const authUrl = `${config.authorizationEndpoint}${
            config.authorizationEndpoint.indexOf('?') > 0 ? '&' : '?'
          }${utils.toQueryParams({
            client_id: config.clientId,
            scope: config.scope || 'openid',
            response_type: 'code',
            state,
            audience: config.audience,
            redirect_uri: redirectUri,
          })}`;

          let unregisterProgress: (() => void) | undefined;
          if (context.progress) {
            unregisterProgress = context.progress.register(() => {
              unregisterListener(state);
              reject(new Error('process canceled'));
            });
          }

          registerListener({
            id: state,
            name: `authorization for ${config.clientId}: ${config.authorizationEndpoint}`,
            resolve: params => {
              if (params.code && params.state === state) {
                if (unregisterProgress) {
                  unregisterProgress();
                }
                const openIdInformation = requestOpenIdInformation(
                  {
                    url: config.tokenEndpoint,
                    method: 'POST',
                    body: utils.toQueryParams({
                      grant_type: 'authorization_code',
                      scope: config.scope,
                      code: params.code,
                      redirect_uri: redirectUri,
                    }),
                  },
                  {
                    config,
                    id,
                    title: `authorization_code: ${config.clientId}`,
                    description: `${config.variablePrefix} - ${config.tokenEndpoint}`,
                    details: {
                      clientId: config.clientId,
                      tokenEndpoint: config.tokenEndpoint,
                      grantType: 'authorization_code',
                    },
                  },
                  context
                );
                resolve(openIdInformation);
                return {
                  valid: true,
                  message: 'code received.',
                  statusMessage: 'code and state valid. starting code exchange',
                };
              }

              if (params.error_description) {
                return {
                  valid: false,
                  message: decodeURIComponent(params.error_description),
                  statusMessage: 'no access_token received',
                };
              }
              return {
                valid: false,
                message: 'no code received',
                statusMessage: 'no code received',
              };
            },
            reject,
          });
          utils.report(context, `autorization_code browser authentication pending: ${authUrl}`);
          open(authUrl);
        } catch (err) {
          unregisterListener(state);
          reject(err);
        }
      });
    }
    return false;
  }
}

export const authorizationCodeFlow = new AuthorizationCodeFlow();
