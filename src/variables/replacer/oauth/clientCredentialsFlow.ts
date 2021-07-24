import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import { OpenIdFlow, OpenIdFlowContext } from './openIdFlow';
import { toQueryParams } from '../../../utils';
import { ProcessorContext } from '../../../models';

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


  async perform(config: OpenIdConfiguration, options: OpenIdFlowContext, context: ProcessorContext): Promise<OpenIdInformation | false> {
    return requestOpenIdInformation({
      url: config.tokenEndpoint,
      method: 'POST',
      headers: {
        'authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: toQueryParams({
        grant_type: 'client_credentials',
        scope: config.scope
      })
    }, {
      httpClient: context.httpClient,
      config,
      id: options.cacheKey,
      title: `clientCredentials: ${config.clientId}`,
      description: `${config.variablePrefix} - ${config.tokenEndpoint}`,
    }, context);
  }
}

export const clientCredentialsFlow = new ClientCredentialsFlow();
