import encodeUrl from 'encodeurl';

import type * as models from '../../../models';
import * as utils from '../../../utils';
import { assertConfiguration } from '../openIdConfiguration';
import { requestOpenIdInformation } from './requestOpenIdInformation';

export class TokenExchangeFlow {
  static getCacheKey(config: models.OpenIdConfiguration): string | false {
    assertConfiguration(config, ['tokenEndpoint', 'clientId', 'clientSecret']);
    return `${config.tokenEndpoint}_${config.clientId}`;
  }

  static async perform(
    config: models.OpenIdConfiguration,
    openIdInformation: models.OpenIdInformation,
    context: models.OpenIdContext
  ): Promise<models.OpenIdInformation | false> {
    if (openIdInformation) {
      utils.report(context, 'execute OAuth2 token exchange flow');
      const jwtToken = utils.decodeJWT(openIdInformation.accessToken);

      return requestOpenIdInformation(
        {
          url: config.tokenEndpoint || '',
          method: 'POST',
          body: utils.toQueryParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
            subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
            scope: config.scope ?? 'openid',
            subject_issuer: config.subjectIssuer || jwtToken?.iss,
            subject_token: encodeUrl(openIdInformation.accessToken),
            audience: config.audience,
            resource: config.resource,
          }),
        },
        {
          config,
          id: openIdInformation.id,
          title: `${openIdInformation.title} (token exchange)`,
          description: openIdInformation.description,
          details: {
            clientId: config.clientId,
            tokenEndpoint: config.tokenEndpoint,
            grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
          },
        },
        context
      );
    }
    return false;
  }
}
