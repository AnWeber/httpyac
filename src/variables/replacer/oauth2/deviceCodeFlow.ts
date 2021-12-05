import * as io from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';
import { OpenIdConfiguration, assertConfiguration } from './openIdConfiguration';
import { OpenIdFlow, OpenIdFlowContext } from './openIdFlow';
import { OpenIdInformation, toOpenIdInformation } from './openIdInformation';
import open from 'open';

class DeviceCodeFlow implements OpenIdFlow {
  supportsFlow(flow: string): boolean {
    return ['device_code', 'device'].indexOf(flow) >= 0;
  }

  getCacheKey(config: OpenIdConfiguration) {
    if (assertConfiguration(config, ['tokenEndpoint', 'deviceCodeEndpoint', 'clientId'])) {
      return `device_code_${config.clientId}_${config.tokenEndpoint}`;
    }
    return false;
  }

  async perform(config: OpenIdConfiguration, context: OpenIdFlowContext): Promise<OpenIdInformation | false> {
    const id = this.getCacheKey(config);
    if (id) {
      utils.report(context, 'execute device_code authorization flow');

      const deviceCodeTime = new Date().getTime();
      const deviceCodeResponse = await this.requestDeviceAuthorization(context, config);

      if (deviceCodeResponse && deviceCodeResponse.statusCode === 200 && utils.isString(deviceCodeResponse.body)) {
        if (models.isProcessorContext(context)) {
          await utils.logResponse(deviceCodeResponse, context);
        }
        utils.report(context, 'device_code received');

        const deviceCodeBody: DevcieCodeBody = JSON.parse(deviceCodeResponse.body);

        let interval = deviceCodeBody.interval ? Number(deviceCodeBody.interval) * 1000 : 5000;
        if (Number.isNaN(interval)) {
          interval = 5000;
        }

        this.showUserCode(deviceCodeBody);

        while (new Date().getTime() - deviceCodeTime < Number(deviceCodeBody.expires_in) * 1000) {
          try {
            await utils.sleep(interval);
            if (context.progress?.isCanceled?.()) {
              return false;
            }
            const time = new Date().getTime();
            const response = await this.authenticateUser(context, config, deviceCodeBody);
            if (response && utils.isString(response.body)) {
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
                  interval += 5000;
                  io.log.debug(`DeviceCode Flow increase interval: ${interval}`);
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
            io.log.debug(err);
            return false;
          }
        }
      }
    }
    return false;
  }

  private async logResponse(response: models.HttpResponse, context: OpenIdFlowContext) {
    if (models.isProcessorContext(context)) {
      await utils.logResponse(response, context);
    }
  }

  private async authenticateUser(
    context: OpenIdFlowContext,
    config: OpenIdConfiguration,
    deviceCodeBody: DevcieCodeBody
  ) {
    return await context?.httpClient(
      {
        url: config.tokenEndpoint,
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: utils.toQueryParams({
          client_id: config.clientId,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          code: deviceCodeBody.device_code,
        }),
      },
      { showProgressBar: false }
    );
  }

  private async requestDeviceAuthorization(context: OpenIdFlowContext, config: OpenIdConfiguration) {
    return await context?.httpClient(
      {
        url: config.deviceCodeEndpoint,
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: utils.toQueryParams({
          client_id: config.clientId,
          scope: config.scope || 'openid',
        }),
      },
      { showProgressBar: false }
    );
  }

  private showUserCode(deviceCodeBody: DevcieCodeBody) {
    const message =
      deviceCodeBody.message ||
      `To sign in, use a web browser to open the page ${deviceCodeBody.verification_uri_complete} and enter the code ${deviceCodeBody.user_code} to authenticate.`;
    io.log.info(message);
    io.log.info(`Verfication_Uri: ${deviceCodeBody.verification_uri_complete || deviceCodeBody.verification_uri}`);
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

interface DevcieCodeBody {
  user_code: string;
  device_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: string;
  interval?: string;
  message?: string;
}

export const deviceCodeFlow = new DeviceCodeFlow();
