import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import { OpenIdFlow } from './openIdFlow';
import { toQueryParams } from '../../../utils';
import { HttpClient } from '../../../models';

class PasswordFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean{
    return ['password'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'clientId', 'clientSecret', 'username', 'password'])) {
      return `password_${config.clientId}_${config.username}_${config.tokenEndpoint}`;
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
        grant_type: 'password',
        scope: config.scope,
        username: config.username,
        password: config.password
      })
    }, {
      httpClient: context.httpClient,
      config: config,
      id: context.cacheKey,
      title: `PasswordFlow: ${config.username} (${config.clientId})`,
      description: `${config.variablePrefix} - ${config.tokenEndpoint}`
    });
  }
}


export const passwordFlow = new PasswordFlow();