import open from 'open';

import * as io from '../../../io';
import type * as models from '../../../models';
import * as utils from '../../../utils';
import { assertConfiguration } from '../openIdConfiguration';
import { OpenIdFlow } from './openIdFlow';
import { addConfigRequestOptions, toOpenIdInformation } from './requestOpenIdInformation';

class DeviceCodeFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['device_code', 'device'].indexOf(flow) >= 0;
  }

  getCacheKey(config: models.OpenIdConfiguration) {
    assertConfiguration(config, ['tokenEndpoint', 'deviceCodeEndpoint', 'clientId']);
    return `device_code_${config.variablePrefix}_${config.clientId}_${config.tokenEndpoint}`;
  }

  async perform(
    config: models.OpenIdConfiguration,
    context: models.OpenIdContext
  ): Promise<models.OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      utils.report(context, 'execute device_code authorization flow');

      const deviceCodeTime = new Date().getTime();
      const deviceCodeResponse = await this.requestDeviceAuthorization(config, context);
      if (deviceCodeResponse && utils.isProcessorContext(context)) {
        await utils.logResponse(deviceCodeResponse, context);
      }
      if (deviceCodeResponse && deviceCodeResponse.statusCode === 200 && utils.isString(deviceCodeResponse.body)) {
        utils.report(context, 'device_code received');

        const deviceCodeBody: DeviceCodeBody = JSON.parse(deviceCodeResponse.body);

        const intervalInSeconds = utils.toNumber(deviceCodeBody.interval) || 5;
        let intervalInMs = intervalInSeconds * 1000.0;
        this.showUserCode(deviceCodeBody);

        while (new Date().getTime() - deviceCodeTime < Number(deviceCodeBody.expires_in) * 1000) {
          try {
            await utils.sleep(intervalInMs);
            if (context.progress?.isCanceled?.()) {
              io.log.trace('process canceled by user');
              return false;
            }
            const time = new Date().getTime();
            const response = await this.authenticateUser(config, deviceCodeBody, context);
            if (response && utils.isString(response.body)) {
              response.tags = ['auth', 'oauth2', 'deviceCode', 'automatic'];
              const parsedBody = JSON.parse(response.body);
              if (response.statusCode === 200) {
                utils.report(context, 'accessToken received');
                await this.logResponse(response, context);
                return toOpenIdInformation(parsedBody, time, {
                  config,
                  id,
                  title: `deviceCode: ${config.clientId}`,
                  description: `${config.variablePrefix} - ${config.tokenEndpoint}`,
                  details: {
                    clientId: config.clientId,
                    tokenEndpoint: config.tokenEndpoint,
                    grantType: 'device_code',
                  },
                });
              }
              utils.report(context, `device code ${parsedBody.error}`);
              if (['slow_down', 'authorization_pending'].indexOf(parsedBody.error) >= 0) {
                if (parsedBody.error === 'slow_down' || response.statusCode === 408) {
                  // on Timeout slow down
                  intervalInMs += 5000;
                  io.log.debug(`DeviceCode Flow increase interval: ${intervalInMs / 1000.0}s`);
                }
              } else {
                if (
                  parsedBody.error &&
                  ['access_denied', 'expired_token', 'bad_verification_code'].indexOf(parsedBody.error) >= 0
                ) {
                  io.log.debug(`DeviceCode Flow aborted: ${parsedBody.error_description || ''}`);
                  await this.logResponse(response, context);
                  return false;
                }
                if (
                  (await io.userInteractionProvider.showWarnMessage?.(
                    `Unknown error code ${parsedBody.error}`,
                    'Continue',
                    'Cancel'
                  )) === 'Cancel'
                ) {
                  await this.logResponse(response, context);
                  return false;
                }
              }
            } else {
              io.log.debug('device code received invalid response');
              return false;
            }
          } catch (err) {
            io.log.debug('error in deviceCodeFlow', err);
            return false;
          }
        }
      }
    }
    return false;
  }

  private async logResponse(response: models.HttpResponse, context: models.OpenIdContext) {
    if (utils.isProcessorContext(context)) {
      await utils.logResponse(response, context);
    }
  }

  private async authenticateUser(
    config: models.OpenIdConfiguration,
    deviceCodeBody: DeviceCodeBody,
    context: models.OpenIdContext
  ) {
    const request: models.HttpRequest = {
      url: config.tokenEndpoint || '',
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: utils.toQueryParams({
        client_id: config.clientId,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCodeBody.device_code,
      }),
    };
    await addConfigRequestOptions(request, config, context);
    const response = await io.httpClientProvider.exchange?.(request, { isMainContext: false });
    if (response && utils.isProcessorContext(context)) {
      await utils.logResponse(response, context);
    }
    return response;
  }

  private async requestDeviceAuthorization(config: models.OpenIdConfiguration, context: models.OpenIdContext) {
    const request: models.HttpRequest = {
      url: config.deviceCodeEndpoint || '',
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: utils.toQueryParams({
        client_id: config.clientId,
        client_secret: config.useDeviceCodeClientSecret ? config.clientSecret : undefined,
        scope: config.scope ?? 'openid',
        audience: config.audience,
        resource: config.resource,
      }),
    };
    await addConfigRequestOptions(request, config, context);
    const response = await io.httpClientProvider.exchange?.(request, { isMainContext: false });

    if (response && utils.isProcessorContext(context)) {
      response.tags = ['auth', 'oauth2', 'deviceCode', 'automatic'];
      await utils.logResponse(response, context);
    }
    return response;
  }

  private showUserCode(deviceCodeBody: DeviceCodeBody) {
    const message =
      deviceCodeBody.message ||
      `To sign in, use a web browser to open the page ${deviceCodeBody.verification_uri_complete} and enter the code ${deviceCodeBody.user_code} to authenticate.`;
    io.log.info(message);
    io.log.info(`Verification_Uri: ${deviceCodeBody.verification_uri_complete || deviceCodeBody.verification_uri}`);
    io.log.info(`User_Code: ${deviceCodeBody.user_code}`);

    const openVerificationUri = async () => {
      await io.userInteractionProvider.setClipboard?.(deviceCodeBody.user_code);
      await open(deviceCodeBody.verification_uri_complete || deviceCodeBody.verification_uri);
    };

    if (io.userInteractionProvider.showInformationMessage) {
      io.userInteractionProvider.showInformationMessage(message, 'Open').then(button => {
        if (button) {
          openVerificationUri();
        }
      });
    } else {
      openVerificationUri();
    }
  }
}

interface DeviceCodeBody {
  user_code: string;
  device_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: string;
  interval?: string;
  message?: string;
}

export const deviceCodeFlow = new DeviceCodeFlow();
