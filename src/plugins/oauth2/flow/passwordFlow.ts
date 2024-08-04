import type * as models from '../../../models';
import * as utils from '../../../utils';
import { assertConfiguration } from '../openIdConfiguration';
import { OpenIdFlow } from './openIdFlow';
import { requestOpenIdInformation } from './requestOpenIdInformation';

class PasswordFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['password'].indexOf(flow) >= 0;
  }

  getCacheKey(config: models.OpenIdConfiguration) {
    assertConfiguration(config, ['tokenEndpoint', 'clientId', 'username', 'password']);
    return `password_${config.variablePrefix}_${config.clientId}_${config.username}_${config.tokenEndpoint}`;
  }

  async perform(
    config: models.OpenIdConfiguration,
    context: models.OpenIdContext
  ): Promise<models.OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      utils.report(context, 'execute OAuth2 password flow');
      return requestOpenIdInformation(
        {
          url: config.tokenEndpoint || '',
          method: 'POST',
          body: utils.toQueryParams({
            grant_type: 'password',
            scope: config.scope,
            username: config.username,
            password: config.password,
            audience: config.audience,
            resource: config.resource,
          }),
        },
        {
          config,
          id,
          title: `password flow: ${config.username} (${config.clientId})`,
          description: `${config.variablePrefix} - ${config.tokenEndpoint}`,
          details: {
            clientId: config.clientId,
            tokenEndpoint: config.tokenEndpoint,
            grantType: 'password',
            username: config.username,
          },
        },
        context
      );
    }
    return false;
  }
}

export const passwordFlow = new PasswordFlow();
