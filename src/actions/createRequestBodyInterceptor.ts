import { fileProvider } from '../io';
import * as models from '../models';
import * as utils from '../utils';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import { EOL } from 'os';

export class CreateRequestBodyInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
  constructor(private readonly rawBody: Array<string | models.RequestBodyImport>) {}

  async beforeTrigger(
    hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    if (context.request && hookContext.index === 0) {
      const contentType = context.request.contentType;
      const requestBodyLines = await this.normalizeBody(this.rawBody, context);
      if (requestBodyLines.length > 0) {
        utils.report(hookContext.arg, 'init request body');
        if (utils.isMimeTypeFormUrlEncoded(contentType)) {
          context.request.body = this.formUrlEncodedJoin(requestBodyLines);
        } else {
          if (requestBodyLines.every(obj => utils.isString(obj)) && utils.isMimeTypeNewlineDelimitedJSON(contentType)) {
            requestBodyLines.push('');
          }

          const body: Array<models.HttpRequestBodyLine> = [];
          const strings: Array<string> = [];
          const lineEnding = utils.isMimeTypeMultiPartFormData(contentType) ? '\r\n' : EOL;

          for (const line of requestBodyLines) {
            if (utils.isString(line)) {
              strings.push(line);
            } else {
              if (strings.length > 0) {
                strings.push('');
                body.push(strings.join(lineEnding));
                strings.length = 0;
              }
              body.push(line);
              strings.push('');
            }
          }

          if (strings.length > 0 && body.length === 0) {
            context.request.body = strings.join(lineEnding);
          } else {
            if (strings.length > 0) {
              body.push(strings.join(lineEnding));
            }
            context.request.body = body;
          }
        }
      }
    }

    return true;
  }

  private async normalizeBody(rawBody: Array<string | models.RequestBodyImport>, context: models.ProcessorContext) {
    const result: Array<models.HttpRequestBodyLine> = [];
    const forceInjectVariables = (filename: string) => {
      if (context.httpRegion.metaData.injectVariables) {
        return true;
      }
      if (context.config?.requestBodyInjectVariablesExtensions) {
        const extname = utils.extensionName(filename);
        if (extname) {
          return context.config.requestBodyInjectVariablesExtensions.indexOf(extname) >= 0;
        }
      }
      return false;
    };

    for (const line of rawBody) {
      if (utils.isString(line)) {
        result.push(line);
      } else {
        const buffer = await utils.replaceFilePath(line.fileName, context, async (path: models.PathLike) => {
          if (forceInjectVariables(line.fileName) || line.injectVariables) {
            return await fileProvider.readFile(path, line.encoding);
          }
          return () => fileProvider.readBuffer(path);
        });
        if (buffer) {
          result.push(buffer);
        }
      }
    }
    return result;
  }

  private formUrlEncodedJoin(body: Array<models.HttpRequestBodyLine>): string {
    const result = body.reduce((previousValue, currentValue, currentIndex) => {
      let prev = previousValue;
      if (utils.isString(currentValue)) {
        prev += `${currentIndex === 0 || currentValue.startsWith('&') ? '' : EOL}${currentValue}`;
      }
      return prev;
    }, '');
    if (utils.isString(result)) {
      return result;
    }
    return '';
  }
}
