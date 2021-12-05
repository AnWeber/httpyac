import * as utils from '../../../utils';
import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdFlow, OpenIdFlowContext } from './openIdFlow';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';

class ClientCredentialsFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['client_credentials', 'client'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'clientId', 'clientSecret'])) {
      return `client_credentials_${config.clientId}_${config.tokenEndpoint}`;
    }
    return false;
  }

  async perform(config: OpenIdConfiguration, context: OpenIdFlowContext): Promise<OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      utils.report(context, 'execute OAuth2 client_credentials flow');
      return requestOpenIdInformation(
        {
          url: config.tokenEndpoint,
          method: 'POST',
          body: utils.toQueryParams({
            grant_type: 'client_credentials',
            scope: config.scope,
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
