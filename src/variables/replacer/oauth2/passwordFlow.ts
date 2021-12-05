import * as utils from '../../../utils';
import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdFlow, OpenIdFlowContext } from './openIdFlow';
import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';

class PasswordFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['password'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'clientId', 'clientSecret', 'username', 'password'])) {
      return `password_${config.clientId}_${config.username}_${config.tokenEndpoint}`;
    }
    return false;
  }

  async perform(config: OpenIdConfiguration, context: OpenIdFlowContext): Promise<OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      utils.report(context, 'execute OAuth2 password flow');
      return requestOpenIdInformation(
        {
          url: config.tokenEndpoint,
          method: 'POST',
          body: utils.toQueryParams({
            grant_type: 'password',
            scope: config.scope,
            username: config.username,
            password: config.password,
          }),
        },
        {
          config,
          id,
          title: `PasswordFlow: ${config.username} (${config.clientId})`,
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
