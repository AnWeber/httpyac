import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import { toQueryParams, decodeJWT } from '../../../utils';
import { HttpClient } from '../../../models';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const encodeUrl = require('encodeurl');

class TokenExchangeFlow {
  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'clientId', 'clientSecret'])) {
      return `${config.tokenEndpoint}_${config.clientId}`;
    }
    return false;
  }

  async perform(config: OpenIdConfiguration, openIdInformation: OpenIdInformation, context: {httpClient: HttpClient}): Promise<OpenIdInformation | false> {
    if (openIdInformation) {
      const jwtToken = decodeJWT(openIdInformation.accessToken);

      return requestOpenIdInformation({
        url: config.tokenEndpoint,
        method: 'POST',
        headers: {
          'authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: toQueryParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          scope: config.scope || 'openid',
          subject_issuer: config.subjectIssuer || jwtToken?.iss,
          subject_token: encodeUrl(openIdInformation.accessToken)
        })
      }, {
        httpClient: context.httpClient,
        config,
        id: openIdInformation.id,
        title: `${openIdInformation.title} (token exchange)`,
        description: openIdInformation.description
      });

    }
    return false;
  }
}

export const tokenExchangeFlow = new TokenExchangeFlow();