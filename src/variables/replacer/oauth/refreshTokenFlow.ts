import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import * as utils from '../../../utils';
import { OpenIdFlowContext } from './openIdFlow';

class RefreshTokenFlow {

  private isTokenExpired(time: number, expiresIn: number, timeSkew: number) {
    return time + 1000 * (expiresIn - timeSkew) < (new Date()).getTime();
  }

  async perform(openIdInformation: OpenIdInformation, context: OpenIdFlowContext): Promise<OpenIdInformation | false> {
    if (!this.isTokenExpired(openIdInformation.time, openIdInformation.expiresIn, openIdInformation.timeSkew)) {
      return openIdInformation;
    }
    if (openIdInformation.refreshToken
      && openIdInformation.refreshExpiresIn
      && !this.isTokenExpired(openIdInformation.time, openIdInformation.refreshExpiresIn, openIdInformation.timeSkew)) {
      utils.report(context, 'execute OAuth2 refresh_token flow');
      return requestOpenIdInformation({
        url: openIdInformation.config.tokenEndpoint,
        method: 'POST',
        body: utils.toQueryParams({
          grant_type: 'refresh_token',
          refresh_token: openIdInformation.refreshToken
        })
      }, {
        config: openIdInformation.config,
        id: openIdInformation.id,
        title: openIdInformation.title,
        description: openIdInformation.description,
        details: {
          clientId: openIdInformation.config.clientId,
          tokenEndpoint: openIdInformation.config.tokenEndpoint,
          grantType: 'refresh_token',
        }
      }, context);
    }
    return false;
  }
}

export const refreshTokenFlow = new RefreshTokenFlow();
