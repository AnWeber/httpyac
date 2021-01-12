import { HttpRegion, HttpFile, HttpRequest } from '../httpRegion';
import { isString, isMimeTypeFormUrlEncoded , isMimeTypeJSON} from '../utils';
import { httpYacApi } from '../httpYacApi';
import { HttpClientOptions } from '../httpClient';
import { log } from '../logger';
import { executeScript, JAVASCRIPT_KEYWORDS } from './jsActionProcessor';
import { EOL } from 'os';
import cloneDeep = require('lodash/cloneDeep');
const encodeUrl = require('encodeurl');
import merge from 'lodash/merge';


export async function httpClientActionProcessor(data: unknown, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>): Promise<void> {
  if (httpRegion.request) {
    const request = await replaceVariablesInRequest(httpRegion.request, httpRegion, httpFile,variables);
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
      if (httpRegion.metaParams.name) {

        if (JAVASCRIPT_KEYWORDS.indexOf(httpRegion.metaParams.name) >= 0) {
          throw new Error(`Javascript Keyword ${httpRegion.metaParams.name} not allowed as name`);
        }else{
          let body = httpRegion.response.body;
          if (isMimeTypeJSON(httpRegion.response.contentType) && isString(httpRegion.response.body)) {
            try {
              body = JSON.parse(httpRegion.response.body);
            } catch (err) {
              log.debug('json parse error', body, err);
            }
          }

          variables[httpRegion.metaParams.name] = body;
          httpFile.variables[httpRegion.metaParams.name] = body;
        }
      }
      log.trace('response', httpRegion.response);
    } catch (err) {
      log.error(httpRegion.request.url, options, err);
      throw err;
    }
  }
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



async function replaceVariablesInRequest(request: HttpRequest, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) {

  const replacedReqeust = cloneDeep(request);
  const replacer = (value: string) => replaceVariables(value, httpFile, httpRegion, variables);

  replacedReqeust.url = await replacer(replacedReqeust.url);

  for (const [headerName, headerValue] of Object.entries(replacedReqeust.headers)) {
    if (isString(headerValue)) {
      replacedReqeust.headers[headerName] = await replacer(headerValue);
    }
  }

  if (replacedReqeust.body) {
    if (isString(replacedReqeust.body)) {
      replacedReqeust.body = await replacer(replacedReqeust.body);
    } else if (Array.isArray(replacedReqeust.body)) {
      const replacedBody: Array<string | (() => Promise<Buffer>)> = [];
      for (const obj of replacedReqeust.body) {
        if (isString(obj)) {
          replacedBody.push(await replacer(obj));
        } else {
          replacedBody.push(obj);
        }
      }
      replacedReqeust.body = replacedBody;
    }
  }
  return replacedReqeust;
}

async function replaceVariables(text: string, httpFile: HttpFile, httpRegion: HttpRegion, variables: Record<string,any>) {
  const variableRegex = /\{{2}(.+?)\}{2}/g;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const [searchValue, jsVariable] = match;
    const script = `exports.$result = (${jsVariable});`;

    let lineOffset = httpRegion.position.requestLine || httpRegion.position.start;
    if (httpRegion.source) {
      const index = httpRegion.source.split(EOL).findIndex(line => line.indexOf(searchValue) >= 0);
      if (index >= 0) {
        lineOffset = httpRegion.position.start + index;
      }
    }
    const value = await executeScript(script, httpFile.fileName, variables, lineOffset);
    if (value.$result) {
      result = result.replace(match[0], `${value.$result}`);
    }
  }
  return result;
}