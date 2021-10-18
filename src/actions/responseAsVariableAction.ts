import { log, userInteractionProvider } from '../io';
import { ActionType, HttpRegionAction, ProcessorContext } from '../models';
import * as utils from '../utils';

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
    const { httpRegion } = context;
    if (httpRegion.metaData.name) {
      const name = httpRegion.metaData.name
        .trim()
        .replace(/\s/u, '_')
        .replace(/-./gu, value => value[1].toUpperCase());
      if (utils.isValidVariableName(name)) {
        utils.setVariableInContext({ [name]: body }, context);
      } else {
        const message = `Javascript Keyword ${name} not allowed as name`;
        userInteractionProvider.showWarnMessage?.(message);
        log.warn(message);
      }
    }

  }

  private handleJWTMetaData(body: unknown, { httpRegion }: ProcessorContext) {
    if (httpRegion.metaData.jwt && httpRegion.response) {
      if (body && typeof body === 'object') {
        const entries = Object.entries(body);

        let checkEntries = entries;
        if (utils.isString(httpRegion.metaData.jwt)) {
          const jwt = httpRegion.metaData.jwt;
          checkEntries = entries.filter(([key]) => jwt.indexOf(key) >= 0);
        }
        for (const [key, value] of checkEntries) {
          const val = this.parseJwtToken(value);
          if (val) {
            entries.push([`${key}_parsed`, val]);
          }
        }
        httpRegion.response.parsedBody = Object.fromEntries(entries);
        httpRegion.response.prettyPrintBody = httpRegion.response.body = JSON.stringify(httpRegion.response.parsedBody, null, 2);
      }
    }
  }


  private parseJwtToken(value: unknown) : utils.JWTToken | null {
    if (utils.isString(value)) {
      try {
        return utils.decodeJWT(value);
      } catch (err) {
        log.error(err);
      }
    }
    return null;
  }

}
