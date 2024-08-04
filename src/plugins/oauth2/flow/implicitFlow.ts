import open from 'open';

import { log } from '../../../io';
import type * as models from '../../../models';
import * as utils from '../../../utils';
import { assertConfiguration } from '../openIdConfiguration';
import { OpenIdFlow } from './openIdFlow';
import { registerListener, unregisterListener } from './openIdHttpServer';
import { requestOpenIdInformation, toOpenIdInformation } from './requestOpenIdInformation';

class ImplicitFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['implicit', 'hybrid'].indexOf(flow) >= 0;
  }

  getCacheKey(config: models.OpenIdConfiguration) {
    assertConfiguration(config, ['tokenEndpoint', 'authorizationEndpoint', 'clientId']);
    return `implicit_${config.variablePrefix}_${config.clientId}_${config.tokenEndpoint}`;
  }

  async perform(
    config: models.OpenIdConfiguration,
    context: models.OpenIdContext
  ): Promise<models.OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      return new Promise<models.OpenIdInformation | false>((resolve, reject) => {
        utils.report(context, 'execute OAuth2 implicit flow');
        const state = utils.stateGenerator();
        try {
          const authUrl = `${config.authorizationEndpoint}${
            config.authorizationEndpoint && config.authorizationEndpoint.indexOf('?') > 0 ? '&' : '?'
          }${utils.toQueryParams({
            client_id: config.clientId,
            scope: config.scope ?? 'openid',
            response_type: config.responseType ?? 'token',
            nonce: utils.stateGenerator(),
            state,
            response_mode: config.responseMode,
            audience: config.audience,
            resource: config.resource,
            redirect_uri: config.redirectUri?.toString(),
          })}`;

          let unregisterProgress: (() => void) | undefined;
          if (context.progress) {
            unregisterProgress = context.progress.register(() => {
              unregisterListener(state);
              resolve(false);
            });
          }

          registerListener({
            id: state,
            port: config.serverPort || Number(config.redirectUri?.port),
            path: config.redirectUri?.pathname || '',
            name: `authorization for ${config.clientId}: ${config.authorizationEndpoint}`,
            resolve: params => {
              if (params.state === state) {
                if (params.code) {
                  const openIdInformation = requestOpenIdInformation(
                    {
                      url: config.tokenEndpoint || '',
                      method: 'POST',
                      body: utils.toQueryParams({
                        grant_type: 'authorization_code',
                        scope: config.scope,
                        code: params.code,
                        redirect_uri: config.redirectUri?.toString(),
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
                    description: config.tokenEndpoint || '',
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
          log.debug(`open browser: ${authUrl}`);
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
