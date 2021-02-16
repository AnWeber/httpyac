import { ProcessorContext, HttpResponse, HttpClientOptions, HttpClient, Progress } from '../../models';
import { isString, toConsoleOutput, decodeJWT } from '../../utils';
import { environmentStore } from '../../environments';
import { log } from '../../logger';
import get from 'lodash/get';
const encodeUrl = require('encodeurl');
import { createServer } from 'http';
import { default as open} from 'open';


interface OpenIdConfig{
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
  port?: string;
}

interface OpenIdInformation{
  clientId: string;
  clientSecret: string;
  url: string;
  accessToken: string;
  expiresIn: number;
  time: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
  timeSkew: number;
  dispose?: () => void;
}

const oauthStore: Record<string, OpenIdInformation> = {};
environmentStore.additionalResets.push(() => {
  for (const [key] of Object.entries(oauthStore)) {
    removeOpenIdInformation(key);
  }
});


export async function openIdVariableReplacer(text: string, type: string, context: ProcessorContext) {
  if (type.toLowerCase() === "authorization" && text) {
    const cacheKey = `${context.httpFile.activeEnvironment?.join('_')}|${text}`;
    try {
      const flows: Record<string, ((config: OpenIdConfig) => Promise<HttpClientOptions | false>) | undefined> = {
        'client_credentials': clientCredentialsFlow,
        'password': passwordFlow,
        'authorization_code': (config) => authorizationCodeFlow(config, context.httpFile.fileName),
        'code': (config) => authorizationCodeFlow(config, context.httpFile.fileName),
      };

      let openIdInformation: OpenIdInformation | false = await refreshTokenOrReuse(oauthStore[cacheKey], context.httpClient, context.progress);
      if (!openIdInformation) {
        const match = /^\s*(openid)\s+(?<flow>[^\s]*)\s+(?<variablePrefix>[^\s]*)\s*((token_exchange)\s+(?<tokenExchangePrefix>[^\s]*))?\s*$/i.exec(text);
        if (match && match.groups && match.groups.flow && match.groups.variablePrefix) {

          const flow = flows[match.groups.flow];
          if (flow) {
            openIdInformation = await requestOpenIdInformation(match.groups.variablePrefix, flow, context);

            if (openIdInformation && match.groups.tokenExchangePrefix) {
              openIdInformation = await requestOpenIdInformation(match.groups.tokenExchangePrefix, config => tokenExchangeFlow(config, openIdInformation), context);
            }
            if (!openIdInformation) {
              throw new Error(`Anmeldung gescheitert`);
            }
          }
        }
      }

      if (openIdInformation) {
        removeOpenIdInformation(cacheKey);
        oauthStore[cacheKey] = openIdInformation;
        keepAlive(cacheKey, context.httpClient);
        return `Bearer ${openIdInformation.accessToken}`;
      }
    } catch (err) {
      removeOpenIdInformation(cacheKey);
      throw err;
    }
  }
  return text;
}

function keepAlive(cacheKey: string, httpClient: HttpClient) {
  const openIdInformation = oauthStore[cacheKey];
  if (openIdInformation) {
    const timeoutId = setTimeout(async () => {
      const result = await refreshToken(openIdInformation, httpClient, undefined);
      if (result) {
        oauthStore[cacheKey] = result;
        keepAlive(cacheKey, httpClient);
      }
    }, (openIdInformation.expiresIn - openIdInformation.timeSkew) * 1000);
    openIdInformation.dispose = () => clearTimeout(timeoutId);
  }
}

function removeOpenIdInformation(cacheKey: string) {
  const cachedOpenIdInformation = oauthStore[cacheKey];
  if (cachedOpenIdInformation) {
    if (cachedOpenIdInformation.dispose) {
      cachedOpenIdInformation.dispose();
    }
    delete oauthStore[cacheKey];
  }


}


async function refreshTokenOrReuse(cachedOpenIdInformation: OpenIdInformation, httpClient: HttpClient, progress: Progress | undefined) {
  if (cachedOpenIdInformation) {
    if (!isTokenExpired(cachedOpenIdInformation.time, cachedOpenIdInformation.expiresIn, cachedOpenIdInformation.timeSkew)) {
      return cachedOpenIdInformation;
    }

    return await refreshToken(cachedOpenIdInformation, httpClient, progress);
  }
  return false;
}


async function refreshToken(cachedOpenIdInformation: OpenIdInformation, httpClient: HttpClient, progress: Progress | undefined) {
  if (cachedOpenIdInformation.refreshToken
    && cachedOpenIdInformation.refreshExpiresIn
    && !isTokenExpired(cachedOpenIdInformation.time, cachedOpenIdInformation.refreshExpiresIn, cachedOpenIdInformation.timeSkew)) {

    const time = new Date().getTime();
    const options: HttpClientOptions = {
      url: cachedOpenIdInformation.url,
      method: 'POST',
      headers: {
        'authorization': `Basic ${Buffer.from(`${cachedOpenIdInformation.clientId}:${cachedOpenIdInformation.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${cachedOpenIdInformation.refreshToken}`
    };
    const response = await httpClient(options, progress, false);
    if (response) {
      response.request = options;
    }
    return toOpenIdInformation(cachedOpenIdInformation.url, cachedOpenIdInformation.clientId, cachedOpenIdInformation.clientSecret, time, response);
  }
  return false;
}

function toOpenIdInformation(url: string, clientId: string, clientSecret: string, time: number, response: false | HttpResponse): OpenIdInformation | false {
  if (response) {
    log.info(toConsoleOutput(response, true));
    if (response.statusCode === 200 && isString(response.body)) {
      const jwtToken = JSON.parse(response.body);
      const parsedToken = decodeJWT(jwtToken.access_token);
      log.info(JSON.stringify(parsedToken, null, 2));
      return {
        url,
        clientId,
        clientSecret,
        time,
        accessToken: jwtToken.access_token,
        expiresIn: jwtToken.expires_in,
        refreshToken: jwtToken.refresh_token,
        refreshExpiresIn: jwtToken.refresh_expires_in,
        timeSkew: Math.floor(time / 1000) - parsedToken.iat,
      };
    }
  }
  return false;
}

function isTokenExpired(time: number, expiresIn: number, timeSkew: number) {
  return time + 1000 * (expiresIn - timeSkew) < (new Date()).getTime();
}

async function requestOpenIdInformation(variablePrefix: string, getOptions: (config: OpenIdConfig) => Promise<HttpClientOptions | false>, { httpClient, progress, variables }: ProcessorContext) : Promise<OpenIdInformation | false>{
  const time = new Date().getTime();

  const getVariable = (name: string) => variables[`${variablePrefix}_${name}`] || get(variables, `${variablePrefix}.${name}`);

  const config: OpenIdConfig = {
    authorizationEndpoint: getVariable('authorizationEndpoint'),
    tokenEndpoint: getVariable('tokenEndpoint'),
    clientId: getVariable('clientId'),
    clientSecret: getVariable('clientSecret'),
    username: getVariable('username'),
    password: getVariable('password'),
    port: getVariable('port') || 3000,
  };

  const options = await getOptions(config);
  if (options) {
    const response = await httpClient(options, progress, false);
    if (response) {
      response.request = options;
    }
    return toOpenIdInformation(config.tokenEndpoint, config.clientId, config.clientSecret, time, response);
  }
  return false;
}

async function clientCredentialsFlow(config: OpenIdConfig) : Promise<HttpClientOptions | false>{
  return {
    url: config.tokenEndpoint,
    method: 'POST',
    headers: {
      'authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  };
}

async function passwordFlow(config: OpenIdConfig) : Promise<HttpClientOptions | false> {
  if (config.username
    && config.password) {
    return {
      url: config.tokenEndpoint,
      method: 'POST',
      headers: {
        'authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=password&username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}`
    };
  }
  return false;
}

async function tokenExchangeFlow(config: OpenIdConfig, openIdInformation: OpenIdInformation | false): Promise<HttpClientOptions | false> {
  if (openIdInformation) {
    const jwtToken = decodeJWT(openIdInformation.accessToken);


    const bodyLines = [
      "grant_type=urn:ietf:params:oauth:grant-type:token-exchange",
      "requested_token_type=urn:ietf:params:oauth:token-type:access_token",
      "subject_token_type=urn:ietf:params:oauth:token-type:access_token",
      "scope=openid",
      `subject_issuer=${jwtToken.iss}`,
      `subject_token=${encodeUrl(openIdInformation.accessToken)}`
    ];
    return {
      url: config.tokenEndpoint,
      method: 'POST',
      headers: {
        'authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: bodyLines.join('&')
    };
  }
  return false;
}


function authorizationCodeFlow(config: OpenIdConfig, filename: string) : Promise<HttpClientOptions | false> {
  return new Promise<HttpClientOptions | false>(async (resolve, reject) => {

    try {


      const redirectUri = `http://localhost:${config.port}/callback`;
      const state = stateGenerator();

      const authUrl = `${config.authorizationEndpoint}?client_id=${encodeURIComponent(config.clientId)}&response_type=code&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      let close: false | (() => void) = false;
      const server = createServer((req, res) => {
        try {
          let message = 'invalid uri';
          let statusCode = 500;
          if (req.url && req.url.startsWith('/callback')) {
            const queryParams = parseQueryParams(req.url);

            if (queryParams.code && queryParams.state === state) {
              resolve({
                url: config.tokenEndpoint,
                method: 'POST',
                headers: {
                  'authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
                  'content-type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=authorization_code&code=${encodeURIComponent(queryParams.code)}&redirect_uri=${encodeURIComponent(redirectUri)}`
              });



              res.setHeader("Location", `vscode://${filename}`);
              statusCode = 302;
              message = 'code and valid state received. switch back to vscode';

              if (close) {
                close();
              }
            } else {
              if (!queryParams.code) {
                message = 'missing code';
              } else {
                message = 'state is not valid';
              }
              resolve(false);
            }
          }
          res.setHeader("Content-Type", "text/html");
          res.writeHead(statusCode, message);
          res.end(getHtml(message));
        } catch (err) {
          log.error(err);
          res.end(getHtml(err));
        }
      });
      server.listen(config.port);
      close = () => server.close();

      await open(authUrl);

    } catch (err) {
      reject(err);
    }
  });
}
function stateGenerator(length: number = 30) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const result = [];
  for (var i = length; i > 0; --i){
    result.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  return result.join('');
}


function parseQueryParams(url: string) {
  return url.substring(url.indexOf('?') + 1).split('&').reduce((prev, current) => {
    const [key, value] = current.split('=');
    prev[key] = value;
    return prev;
  }, {} as Record<string,string>);
}

function getHtml(message: string) {

  return `
<html>
<body>
  <p align="center">
    <img src="https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png" alt="HttpYac Logo" />
  </p>
  <div>${message}</message>
</body>
</html>`;
}