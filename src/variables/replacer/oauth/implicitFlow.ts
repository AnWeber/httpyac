import { log } from '../../../io';
import * as utils from '../../../utils';
import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdFlow, OpenIdFlowContext } from './openIdFlow';
import { registerListener, unregisterListener } from './openIdHttpserver';
import { OpenIdInformation, toOpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import open from 'open';

class ImplicitFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['implicit', 'hybrid'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'authorizationEndpoint', 'clientId'])) {
      return `implicit_${config.clientId}_${config.tokenEndpoint}`;
    }
    return false;
  }

  async perform(config: OpenIdConfiguration, context: OpenIdFlowContext): Promise<OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      return new Promise<OpenIdInformation | false>((resolve, reject) => {
        utils.report(context, 'execute OAuth2 implicit flow');
        const state = utils.stateGenerator();
        try {
          const redirectUri = 'http://localhost:3000/callback';
          const authUrl = `${config.authorizationEndpoint}${
            config.authorizationEndpoint.indexOf('?') > 0 ? '&' : '?'
          }${utils.toQueryParams({
            client_id: config.clientId,
            scope: config.scope || 'openid',
            response_type: config.responseType || 'token',
            nonce: utils.stateGenerator(),
            state,
            response_mode: config.responseMode,
            audience: config.audience,
            redirect_uri: redirectUri,
          })}`;

          let unregisterProgress: (() => void) | undefined;
          if (context.progress) {
            unregisterProgress = context.progress.register(() => {
              unregisterListener(state);
              reject(new Error('progress cancel'));
            });
          }

          registerListener({
            id: state,
            name: `authorization for ${config.clientId}: ${config.authorizationEndpoint}`,
            resolve: params => {
              if (params.state === state) {
                if (params.code) {
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
                      title: `implicit: ${config.clientId}`,
                      description: `${config.variablePrefix} - ${config.tokenEndpoint}`,
                      details: {
                        clientId: config.clientId,
                        tokenEndpoint: config.tokenEndpoint,
                        grantType: 'implicit',
                      },
                    },
                    context
                  );
                  resolve(openIdInformation);
                  return {
                    valid: true,
                    message: 'code received.',
                    statusMessage: 'code valid. starting code exchange',
                  };
                }
                if (params.access_token) {
                  if (unregisterProgress) {
                    unregisterProgress();
                  }
                  const openIdInformation = toOpenIdInformation(params, new Date().getTime(), {
                    config,
                    id,
                    title: `implicit: ${config.clientId}`,
                    description: config.tokenEndpoint,
                    details: {
                      clientId: config.clientId,
                      tokenEndpoint: config.tokenEndpoint,
                      grantType: 'implicit',
                    },
                  });
                  resolve(openIdInformation);
                  return {
                    valid: true,
                    message: 'access_token received.',
                    statusMessage: 'access_token and state valid.',
                  };
                }
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
                message: 'no access_token received',
                statusMessage: 'no access_token received',
              };
            },
            reject,
          });
          log.trace(`open browser: ${authUrl}`);
          utils.report(context, `implicit browser authentication pending: ${authUrl}`);
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

export const implicitFlow = new ImplicitFlow();
