import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import { OpenIdFlow } from './openIdFlow';
import { toQueryParams } from '../../../utils';
import { HttpClient } from '../../../models';

class ClientCredentialsFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean{
    return ['client_credentials', 'client'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'clientId', 'clientSecret'])) {
      return `client_credentials_${config.clientId}_${config.tokenEndpoint}`;
    }
    return false;
  }


  async perform(config: OpenIdConfiguration, context: {httpClient: HttpClient, cacheKey: string}): Promise<OpenIdInformation | false> {
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
      config: config,
      id: context.cacheKey,
      title: `clientCredentials: ${config.clientId}`,
      description: `${config.variablePrefix} - ${config.tokenEndpoint}`
    });
  }
}

export const clientCredentialsFlow = new ClientCredentialsFlow();