import { ActionType, HttpRegion, HttpRegionAction, ProcessorContext } from '../models';
import get from 'lodash/get';
import { log, popupService, logRequest } from '../logger';
import { decodeJWT, isString, toEnvironmentKey } from '../utils';
import { isValidVariableName } from './javascriptAction';

export class ResponseAsVariableAction implements HttpRegionAction {
  type = ActionType.response;


  async process(context: ProcessorContext): Promise<boolean> {
    if (context.httpRegion.response) {
      const response = context.httpRegion.response;
      const body = response.parsedBody || response.body;
      context.variables['response'] = response;
      if (context.httpRegion.metaData.name || context.httpRegion.metaData.jwt) {
        this.handleJWTMetaData(body, context.httpRegion);
        this.handleNameMetaData(body, context);
      }
      if (!context.httpRegion.metaData.noLog) {
        logRequest.info(context.httpRegion.response);
      }
    }
    return true;
  }

  private handleNameMetaData(body: unknown, context: ProcessorContext) {
    const { httpRegion, httpFile, variables } = context;
    if (httpRegion.metaData.name && isValidVariableName(httpRegion.metaData.name)) {
      variables[httpRegion.metaData.name] = body;
      httpFile.variablesPerEnv[toEnvironmentKey(httpFile.activeEnvironment)][httpRegion.metaData.name] = body;
    } else if (httpRegion.metaData.name) {
      popupService.warn(`Javascript Keyword ${httpRegion.metaData.name} not allowed as name`);
      log.warn(`Javascript Keyword ${httpRegion.metaData.name} not allowed as name`);
    }
  }

  private handleJWTMetaData(body: unknown, httpRegion: HttpRegion) {
    if (httpRegion.metaData.jwt && httpRegion.response) {
      if (body && isString(httpRegion.metaData.jwt)) {
        for (const key of httpRegion.metaData.jwt.split(',')) {
          const value = get(body, key);
          this.parseJwtToken(body, key, value);
        }
      } else if (body && typeof body === 'object') {
        for (const [key, value] of Object.entries(body)) {
          this.parseJwtToken(body, key, value);
        }
      }
      httpRegion.response.body = JSON.stringify(body, null, 2);
    }
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseJwtToken(response: any, key: string, value: unknown) {
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

}