import { HttpRegion, ProcessorContext} from '../models';
import get from 'lodash/get';
import { log, popupService, logRequest } from '../logger';
import { decodeJWT, isMimeTypeJSON, isString, toEnvironmentKey } from '../utils';
import { isValidVariableName } from './jsActionProcessor';

export async function responseAsVariableActionProcessor(data: string, context: ProcessorContext) {
  if (context.httpRegion.response) {

    let body = context.httpRegion.response.body;

    if (context.httpRegion.response
      && isMimeTypeJSON(context.httpRegion.response.contentType)
      && isString(body)) {
      try {
        body = JSON.parse(body);
      } catch (err) {
        popupService.warn('json parse error', body);
        log.warn('json parse error', body, err);
      }
    }
    context.variables['response'] = body;

    if (context.httpRegion.metaData.name || context.httpRegion.metaData.jwt) {
      handleJWTMetaData(body, context.httpRegion);
      handleNameMetaData(body, context);
    }


    if (!context.httpRegion.metaData.noLog) {
      logRequest.info(context.httpRegion.response);
    }
  }
  return true;
}


function handleNameMetaData(body: unknown, context: ProcessorContext) {
  const { httpRegion, httpFile, variables } = context;
  if (httpRegion.metaData.name && isValidVariableName(httpRegion.metaData.name)) {
    variables[httpRegion.metaData.name] = body;
    httpFile.variablesPerEnv[toEnvironmentKey(httpFile.activeEnvironment)][httpRegion.metaData.name] = body;
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
