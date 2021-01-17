import {ProcessorContext, HttpRequest, VariableReplacerType } from '../models';
import { isString, isMimeTypeFormUrlEncoded , isMimeTypeJSON, toEnvironmentKey} from '../utils';
import { httpYacApi } from '../httpYacApi';
import { HttpClientOptions } from '../httpClient';
import { log } from '../logger';
import { JAVASCRIPT_KEYWORDS } from './jsActionProcessor';
import cloneDeep = require('lodash/cloneDeep');
import merge from 'lodash/merge';
const encodeUrl = require('encodeurl');


export async function httpClientActionProcessor(data: unknown, {httpRegion, httpFile, variables}: ProcessorContext): Promise<boolean> {
  if (httpRegion.request) {
    const request = await replaceVariablesInRequest(httpRegion.request, {httpRegion, httpFile, variables});
    const options: HttpClientOptions = merge({
      headers: request.headers,
      method: request.method,
      body: await normalizeBody(request.body)
    }, request.options);
    if (options.body && isString(options.body) && isMimeTypeFormUrlEncoded(request.contentType)) {
      options.body = encodeUrl(options.body);
    }
    request.url = encodeUrl(request.url);
    try {
      log.debug('request', request.url, options);
      const response = await httpYacApi.httpClient(request.url, options);
      response.request = request;
      httpRegion.response = response;
      if (httpRegion.metaData.name) {

        if (JAVASCRIPT_KEYWORDS.indexOf(httpRegion.metaData.name) >= 0) {
          throw new Error(`Javascript Keyword ${httpRegion.metaData.name} not allowed as name`);
        }else{
          let body = httpRegion.response.body;
          if (isMimeTypeJSON(httpRegion.response.contentType) && isString(httpRegion.response.body)) {
            try {
              body = JSON.parse(httpRegion.response.body);
            } catch (err) {
              log.debug('json parse error', body, err);
            }
          }

          variables[httpRegion.metaData.name] = body;
          httpFile.environments[toEnvironmentKey(httpFile.activeEnvironment)][httpRegion.metaData.name] = body;
        }
      }
      log.trace('response', httpRegion.response);
    } catch (err) {
      log.error(httpRegion.request.url, options, err);
      throw err;
    }
  }
  return true;
};

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
  const replacer = (value: string, type: VariableReplacerType | string) => httpYacApi.replaceVariables(value, type, context);

  replacedReqeust.url = await replacer(replacedReqeust.url, VariableReplacerType.url);

  for (const [headerName, headerValue] of Object.entries(replacedReqeust.headers)) {
    if (isString(headerValue)) {
      replacedReqeust.headers[headerName] = await replacer(headerValue, headerName);
    }
  }

  if (replacedReqeust.body) {
    if (isString(replacedReqeust.body)) {
      replacedReqeust.body = await replacer(replacedReqeust.body, VariableReplacerType.body);
    } else if (Array.isArray(replacedReqeust.body)) {
      const replacedBody: Array<string | (() => Promise<Buffer>)> = [];
      for (const obj of replacedReqeust.body) {
        if (isString(obj)) {
          replacedBody.push(await replacer(obj, VariableReplacerType.body));
        } else {
          replacedBody.push(obj);
        }
      }
      replacedReqeust.body = replacedBody;
    }
  }
  return replacedReqeust;
}


