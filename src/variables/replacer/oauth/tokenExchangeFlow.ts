import { ProcessorContext } from '../../../models';
import * as utils from '../../../utils';
import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import encodeUrl from 'encodeurl';

export class TokenExchangeFlow {
  static getCacheKey(config: OpenIdConfiguration): string | false {
    if (assertConfiguration(config, ['tokenEndpoint', 'clientId', 'clientSecret'])) {
      return `${config.tokenEndpoint}_${config.clientId}`;
    }
    return false;
  }

  static async perform(
    config: OpenIdConfiguration,
    openIdInformation: OpenIdInformation,
    context: ProcessorContext
  ): Promise<OpenIdInformation | false> {
    if (openIdInformation) {
      utils.report(context, 'execute OAuth2 token exchange flow');
      const jwtToken = utils.decodeJWT(openIdInformation.accessToken);

      return requestOpenIdInformation(
        {
          url: config.tokenEndpoint,
          method: 'POST',
          body: utils.toQueryParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
            subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
            scope: config.scope || 'openid',
            subject_issuer: config.subjectIssuer || jwtToken?.iss,
            subject_token: encodeUrl(openIdInformation.accessToken),
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
