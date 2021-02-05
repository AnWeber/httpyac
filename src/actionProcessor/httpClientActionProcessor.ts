import {ProcessorContext, HttpRequest, VariableReplacerType , HttpClientOptions, HttpFile, HttpRegion} from '../models';
import { isString, isMimeTypeFormUrlEncoded , isMimeTypeJSON, toEnvironmentKey , toConsoleOutput} from '../utils';
import { httpYacApi } from '../httpYacApi';
import { log } from '../logger';
import { JAVASCRIPT_KEYWORDS } from './jsActionProcessor';
import cloneDeep = require('lodash/cloneDeep');
import merge from 'lodash/merge';
const encodeUrl = require('encodeurl');


export async function httpClientActionProcessor(data: unknown, {httpRegion, httpFile, variables, progress}: ProcessorContext): Promise<boolean> {
  if (httpRegion.request) {
    const request = await replaceVariablesInRequest(httpRegion.request, {httpRegion, httpFile, variables});
    const options: HttpClientOptions = await initOptions(request, httpRegion.metaData.proxy);

    try {
      log.debug('request', options);

      const response = await httpYacApi.httpClient(options, progress);
      if (response) {
        response.request = request;
        httpRegion.response = response;
        setResponseAsVariable(httpRegion, variables, httpFile);
        log.info(toConsoleOutput(httpRegion.response));
      } else {
        return false;
      }
    } catch (err) {
      log.error(httpRegion.request.url, options, err);
      throw err;
    }
  }
  return true;
};

function setResponseAsVariable(httpRegion: HttpRegion<any>, variables: Record<string, any>, httpFile: HttpFile) {
  if (httpRegion.metaData.name && httpRegion.response) {
    if (JAVASCRIPT_KEYWORDS.indexOf(httpRegion.metaData.name) >= 0) {
      throw new Error(`Javascript Keyword ${httpRegion.metaData.name} not allowed as name`);
    } else {
      let body = httpRegion.response.body;
      if (isMimeTypeJSON(httpRegion.response.contentType) && isString(httpRegion.response.body)) {
        try {
          body = JSON.parse(httpRegion.response.body);
        } catch (err) {
          log.warn('json parse error', body, err);
        }
      }

      variables[httpRegion.metaData.name] = body;
      httpFile.environments[toEnvironmentKey(httpFile.activeEnvironment)][httpRegion.metaData.name] = body;
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
  const replacer = (value: string, type: VariableReplacerType | string) => httpYacApi.replaceVariables(value, type, context);
  replacedReqeust.url = await replacer(replacedReqeust.url, VariableReplacerType.url) || replacedReqeust.url;
  for (const [headerName, headerValue] of Object.entries(replacedReqeust.headers)) {
    if (isString(headerValue)) {
      const value = await replacer(headerValue, headerName);
      if (value === undefined) {
        delete replacedReqeust.headers[headerName];
      }else{
        replacedReqeust.headers[headerName] = value;
      }
    }
  }
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
  delete context.request;
  return replacedReqeust;
}


