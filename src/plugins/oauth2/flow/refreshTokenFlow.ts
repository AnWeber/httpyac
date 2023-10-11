import * as models from '../../../models';
import * as utils from '../../../utils';
import { requestOpenIdInformation } from './requestOpenIdInformation';

class RefreshTokenFlow {
  private isTokenExpired(time: number, timeSkew: number, expiresIn?: number) {
    if (typeof expiresIn !== 'undefined') {
      return time + 1000 * (expiresIn - timeSkew) < new Date().getTime();
    }
    return false;
  }

  async perform(
    openIdInformation: models.OpenIdInformation,
    context: models.OpenIdContext
  ): Promise<models.OpenIdInformation | false> {
    if (!this.isTokenExpired(openIdInformation.time, openIdInformation.timeSkew, openIdInformation.expiresIn)) {
      return openIdInformation;
    }
    if (
      openIdInformation.refreshToken &&
      !this.isTokenExpired(openIdInformation.time, openIdInformation.timeSkew, openIdInformation.refreshExpiresIn)
    ) {
      utils.report(context, 'execute OAuth2 refresh_token flow');
      const { tokenEndpoint, scope, resource, audience } = openIdInformation.config;
      return requestOpenIdInformation(
        {
          url: tokenEndpoint || '',
          method: 'POST',
          body: utils.toQueryParams({
            grant_type: 'refresh_token',
            refresh_token: openIdInformation.refreshToken,
            scope,
            audience,
            resource,
          }),
        },
        {
          config: openIdInformation.config,
          id: openIdInformation.id,
          title: openIdInformation.title,
          description: openIdInformation.description,
          details: {
            clientId: openIdInformation.config.clientId,
            tokenEndpoint: openIdInformation.config.tokenEndpoint,
            grantType: 'refresh_token',
          },
        },
        context
      );
    }
    return false;
  }
}

export const refreshTokenFlow = new RefreshTokenFlow();
