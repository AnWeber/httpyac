import type * as models from '../../../models';
import * as utils from '../../../utils';
import { assertConfiguration } from '../openIdConfiguration';
import { OpenIdFlow } from './openIdFlow';
import { registerListener, unregisterListener } from './openIdHttpServer';
import { requestOpenIdInformation } from './requestOpenIdInformation';
import open from 'open';

class AuthorizationCodeFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['authorization_code', 'code'].indexOf(flow) >= 0;
  }

  getCacheKey(config: models.OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'authorizationEndpoint', 'clientId'])) {
      return `authorization_code_${config.variablePrefix}_${config.clientId}_${config.tokenEndpoint}`;
    }
    return false;
  }

  async perform(
    config: models.OpenIdConfiguration,
    context: models.OpenIdContext
  ): Promise<models.OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      return new Promise<models.OpenIdInformation | false>((resolve, reject) => {
        const state = utils.stateGenerator();
        const verifier = config.usePkce ? utils.stateGenerator(64) : undefined;
        try {
          utils.report(context, 'execute OAuth2 authorization_code flow');
          const authUrl = `${config.authorizationEndpoint}${
            config.authorizationEndpoint.indexOf('?') > 0 ? '&' : '?'
          }${utils.toQueryParams({
            client_id: config.clientId,
            scope: config.scope || 'openid',
            response_type: 'code',
            state,
            audience: config.audience,
            redirect_uri: config.redirectUri.toString(),
            ...(verifier ? { code_challenge: utils.createSha256(verifier), code_challenge_method: 'S256' } : {}),
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
            url: config.redirectUri,
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
                      redirect_uri: config.redirectUri.toString(),
                      ...(verifier ? { code_verifier: verifier } : {}),
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
          utils.report(context, `authorization_code browser authentication pending: ${authUrl}`);
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
