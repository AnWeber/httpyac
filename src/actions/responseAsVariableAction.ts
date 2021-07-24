import { log } from '../io';
import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import { decodeJWT, isString, JWTToken, toEnvironmentKey } from '../utils';
import { isValidVariableName } from './javascriptAction';

export class ResponseAsVariableAction implements HttpRegionAction {
  id = ActionType.response;


  async process(context: ProcessorContext): Promise<boolean> {
    if (context.httpRegion.response) {
      const response = context.httpRegion.response;
      const body = response.parsedBody || response.body;
      context.variables.response = response;
      if (context.httpRegion.metaData.name || context.httpRegion.metaData.jwt) {
        this.handleJWTMetaData(body, context);
        this.handleNameMetaData(body, context);
      }
    }
    return true;
  }

  private handleNameMetaData(body: unknown, context: ProcessorContext) {
    const { httpRegion, httpFile, variables } = context;
    if (httpRegion.metaData.name) {
      const name = httpRegion.metaData.name
        .trim()
        .replace(/\s/u, '_')
        .replace(/-./gu, value => value[1].toUpperCase());
      if (isValidVariableName(name)) {
        variables[httpRegion.metaData.name] = body;
        httpFile.variablesPerEnv[toEnvironmentKey(httpFile.activeEnvironment)][name] = body;
      } else {
        log.warn(`Javascript Keyword ${name} not allowed as name`);
      }
    }

  }

  private handleJWTMetaData(body: unknown, { httpRegion }: ProcessorContext) {
    if (httpRegion.metaData.jwt && httpRegion.response) {
      if (body && typeof body === 'object') {
        const entries = Object.entries(body);

        let checkEntries = entries;
        if (isString(httpRegion.metaData.jwt)) {
          const jwt = httpRegion.metaData.jwt;
          checkEntries = entries.filter(([key]) => jwt.indexOf(key) >= 0);
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
