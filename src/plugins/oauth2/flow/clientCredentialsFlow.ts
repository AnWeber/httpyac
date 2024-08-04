import type * as models from '../../../models';
import * as utils from '../../../utils';
import { assertConfiguration } from '../openIdConfiguration';
import { OpenIdFlow } from './openIdFlow';
import { requestOpenIdInformation } from './requestOpenIdInformation';

class ClientCredentialsFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['client_credentials', 'client'].indexOf(flow) >= 0;
  }

  getCacheKey(config: models.OpenIdConfiguration) {
    assertConfiguration(config, ['tokenEndpoint', 'clientId', 'clientSecret']);
    return `client_credentials_${config.variablePrefix}_${config.clientId}_${config.tokenEndpoint}`;
  }

  async perform(
    config: models.OpenIdConfiguration,
    context: models.OpenIdContext
  ): Promise<models.OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      utils.report(context, 'execute OAuth2 client_credentials flow');
      return requestOpenIdInformation(
        {
          url: config.tokenEndpoint || '',
          method: 'POST',
          body: utils.toQueryParams({
            grant_type: 'client_credentials',
            scope: config.scope,
            audience: config.audience,
            resource: config.resource,
          }),
        },
        {
          config,
          id,
          title: `clientCredentials: ${config.clientId}`,
          description: `${config.variablePrefix} - ${config.tokenEndpoint}`,
          details: {
            clientId: config.clientId,
            tokenEndpoint: config.tokenEndpoint,
            grantType: 'client_credentials',
          },
        },
        context
      );
    }
    return false;
  }
}

export const clientCredentialsFlow = new ClientCredentialsFlow();
