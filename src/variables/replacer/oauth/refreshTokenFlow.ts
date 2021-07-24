import { OpenIdInformation, requestOpenIdInformation } from './openIdInformation';
import { toQueryParams } from '../../../utils';
import { HttpClient, ProcessorContext } from '../../../models';

class RefreshTokenFlow {

  private isTokenExpired(time: number, expiresIn: number, timeSkew: number) {
    return time + 1000 * (expiresIn - timeSkew) < (new Date()).getTime();
  }

  async perform(openIdInformation: OpenIdInformation, options: {httpClient: HttpClient }, context?: ProcessorContext): Promise<OpenIdInformation | false> {
    if (!this.isTokenExpired(openIdInformation.time, openIdInformation.expiresIn, openIdInformation.timeSkew)) {
      return openIdInformation;
    }
    if (openIdInformation.refreshToken
      && openIdInformation.refreshExpiresIn
      && !this.isTokenExpired(openIdInformation.time, openIdInformation.refreshExpiresIn, openIdInformation.timeSkew)) {

      return requestOpenIdInformation({
        url: openIdInformation.config.tokenEndpoint,
        method: 'POST',
        headers: {
          'authorization': `Basic ${Buffer.from(`${openIdInformation.config.clientId}:${openIdInformation.config.clientSecret}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: toQueryParams({
          grant_type: 'refresh_token',
          refresh_token: openIdInformation.refreshToken
        })
      }, {
        httpClient: options.httpClient,
        config: openIdInformation.config,
        id: openIdInformation.id,
        title: openIdInformation.title,
        description: openIdInformation.description,
      }, context);
    }
    return false;
  }
}

export const refreshTokenFlow = new RefreshTokenFlow();
