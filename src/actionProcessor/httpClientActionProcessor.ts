import {ProcessorContext, HttpRequest, VariableReplacerType , HttpClientOptions, HttpFile, HttpRegion} from '../models';
import { isString, isMimeTypeFormUrlEncoded , isMimeTypeJSON, toEnvironmentKey , toConsoleOutput, decodeJWT} from '../utils';
import { httpYacApi } from '../httpYacApi';
import { log, popupService } from '../logger';
import { isValidVariableName } from './jsActionProcessor';
import cloneDeep = require('lodash/cloneDeep');
import merge from 'lodash/merge';
import get from 'lodash/get';
const encodeUrl = require('encodeurl');


export async function httpClientActionProcessor(data: unknown, context: ProcessorContext): Promise<boolean> {
  const { httpRegion, httpFile, httpClient, variables } = context;
  if (httpRegion.request) {
    const request = await replaceVariablesInRequest(httpRegion.request, { httpRegion, httpFile, variables, httpClient });
    if (!!request) {
      const options: HttpClientOptions = await initOptions(request, httpRegion.metaData.proxy);
      options.followRedirect = !httpRegion.metaData.noRedirect;

      try {
        if (!httpRegion.metaData.noLog) {
          log.debug('request', options);
        }

        const response = await httpClient(options, context);
        if (response) {
          response.request = options;
          httpRegion.response = response;
          setResponseAsVariable(httpRegion, variables, httpFile);
          if(!httpRegion.metaData.noLog){
            log.info(toConsoleOutput(httpRegion.response));
          }
          return true;
        }
      } catch (err) {
        log.error(httpRegion.request.url, options, err);
        throw err;
      }
    }
  }
  return false;
};

function setResponseAsVariable(httpRegion: HttpRegion<any>, variables: Record<string, any>, httpFile: HttpFile) {

  if (httpRegion.response && isMimeTypeJSON(httpRegion.response.contentType) && isString(httpRegion.response.body)) {
    let body = httpRegion.response.body;
    try {
      if (httpRegion.metaData.name || httpRegion.metaData.jwt) {
        body = JSON.parse(httpRegion.response.body);

        handleJWTMetaData(body, httpRegion);
        handleNameMetaData(body, httpRegion, variables, httpFile);
      }
    } catch (err) {
      popupService.warn('json parse error', body);
      log.warn('json parse error', body, err);
    }
  }
}


async function initOptions(request: HttpRequest<any>, proxy: string | undefined) {
  const options: HttpClientOptions = merge({
    url: encodeUrl(request.url),
    headers: request.headers,
    method: request.method,
    body: await normalizeBody(request.body),
    proxy
  }, request.options);
  if (options.body && isString(options.body) && isMimeTypeFormUrlEncoded(request.contentType)) {
    options.body = encodeUrl(options.body);
  }
  return options;
}

async function normalizeBody(body: string | Array<string | (() => Promise<Buffer>)> | undefined) {
  if (isString(body)) {
    return body;
  }else if (Array.isArray(body)) {
    const buffers: Array<Buffer> = [];
    for (const obj of body) {
      if (isString(obj)) {
        buffers.push(Buffer.from(obj));
      } else {
        buffers.push(await obj());
      }
    }
    return Buffer.concat(buffers);
  }
  return body;
}



async function replaceVariablesInRequest(request: HttpRequest, context: ProcessorContext) {
  const replacedReqeust = cloneDeep(request);
  context.request = replacedReqeust;

  let cancel = false;
  context.cancelVariableReplacer = () => cancel = true;

  const replacer = async (value: string, type: VariableReplacerType | string) => {
    if (!cancel) {
      return await httpYacApi.replaceVariables(value, type, context);
    }
    return value;
  };

  replacedReqeust.url = await replacer(replacedReqeust.url, VariableReplacerType.url) || replacedReqeust.url;
  await replaceVariablesInHeader(replacedReqeust, replacer);
  await replaceVariablesInBody(replacedReqeust, replacer);
  delete context.request;
  if (!cancel) {
    return replacedReqeust;
  }
  return false;
}


async function replaceVariablesInBody(replacedReqeust: HttpRequest<any>, replacer: (value: string, type: VariableReplacerType | string) => Promise<string | undefined>) {
  if (replacedReqeust.body) {
    if (isString(replacedReqeust.body)) {
      replacedReqeust.body = await replacer(replacedReqeust.body, VariableReplacerType.body);
    } else if (Array.isArray(replacedReqeust.body)) {
      const replacedBody: Array<string | (() => Promise<Buffer>)> = [];
      for (const obj of replacedReqeust.body) {
        if (isString(obj)) {
          const value = await replacer(obj, VariableReplacerType.body);
          if (value) {
            replacedBody.push(value);
          }
        } else {
          replacedBody.push(obj);
        }
      }
      replacedReqeust.body = replacedBody;
    }
  }
}

async function replaceVariablesInHeader(replacedReqeust: HttpRequest<any>, replacer: (value: string, type: VariableReplacerType | string) => Promise<string | undefined>) {
  for (const [headerName, headerValue] of Object.entries(replacedReqeust.headers)) {
    if (isString(headerValue)) {
      const value = await replacer(headerValue, headerName);
      if (value === undefined) {
        delete replacedReqeust.headers[headerName];
      } else {
        replacedReqeust.headers[headerName] = value;
      }
    }
  }
}

function handleNameMetaData(body: unknown,httpRegion: HttpRegion<any>, variables: Record<string, any>, httpFile: HttpFile) {
  if (httpRegion.metaData.name && isValidVariableName(httpRegion.metaData.name)) {
    variables[httpRegion.metaData.name] = body;
    httpFile.environments[toEnvironmentKey(httpFile.activeEnvironment)][httpRegion.metaData.name] = body;
  } else if (httpRegion.metaData.name) {
    popupService.warn(`Javascript Keyword ${httpRegion.metaData.name} not allowed as name`);
    log.warn(`Javascript Keyword ${httpRegion.metaData.name} not allowed as name`);
  }
}

function handleJWTMetaData(body: unknown, httpRegion: HttpRegion ) {
  if (httpRegion.metaData.jwt && body && httpRegion.response) {
    if (isString(httpRegion.metaData.jwt)) {
      for (const key of httpRegion.metaData.jwt.split(',')) {
        const value = get(body, key);
        parseJwtToken(body, key, value);
      }
    } else if (body && typeof body === 'object') {
      for (const [key, value] of Object.entries(body)) {
        parseJwtToken(body, key, value);
      }
    }
    httpRegion.response.body = JSON.stringify(body, null, 2);
  }
}


function parseJwtToken(response: any, key: string, value: any) {
  if (isString(value)) {
    try {
      const jwt = decodeJWT(value);
      if (jwt) {
        response[`${key}_parsed`] = jwt;
      }
    } catch (err) {
      log.error(err);
    }
  }
}