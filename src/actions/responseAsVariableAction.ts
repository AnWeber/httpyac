import { ActionType, HttpRegion, HttpRegionAction, ProcessorContext } from '../models';
import { log, popupService } from '../logger';
import { decodeJWT, isString, JWTToken, toEnvironmentKey } from '../utils';
import { isValidVariableName } from './javascriptAction';

export class ResponseAsVariableAction implements HttpRegionAction {
  type = ActionType.response;


  async process(context: ProcessorContext): Promise<boolean> {
    if (context.httpRegion.response) {
      const response = context.httpRegion.response;
      const body = response.parsedBody || response.body;
      context.variables.response = response;
      if (context.httpRegion.metaData.name || context.httpRegion.metaData.jwt) {
        this.handleJWTMetaData(body, context.httpRegion);
        this.handleNameMetaData(body, context);
      }
      if (!context.httpRegion.metaData.noLog && context.logResponse) {
        context.logResponse(context.httpRegion.response);
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
      if (body && typeof body === 'object') {
        const entries = Object.entries(body);

        let checkEntries = entries;
        if (isString(httpRegion.metaData.jwt)) {
          checkEntries = entries.filter(([key]) => httpRegion.metaData.jwt.indexOf(key) >= 0);
        }
        for (const [key, value] of checkEntries) {
          const val = this.parseJwtToken(value);
          if (val) {
            entries.push([`${key}_parsed`, val]);
          }
        }
        httpRegion.response.body = JSON.stringify(Object.entries(entries), null, 2);
      }
    }
  }


  private parseJwtToken(value: unknown) : JWTToken | null {
    if (isString(value)) {
      try {
        return decodeJWT(value);
      } catch (err) {
        log.error(err);
      }
    }
    return null;
  }

}
