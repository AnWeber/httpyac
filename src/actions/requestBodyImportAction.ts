import { ActionType, HttpRegionAction, HttpRequestBodyLine, ProcessorContext, RequestBodyImport } from '../models';
import { isMimeTypeFormUrlEncoded, isMimeTypeMultiPartFormData, isMimeTypeNewlineDelimitedJSON, isString, toAbsoluteFilename } from '../utils';
import { fileProvider, userInteractionProvider, log } from '../io';
import { EOL } from 'os';


export class RequestBodyImportAction implements HttpRegionAction {
  id = ActionType.requestBodyImport;


  async process(context: ProcessorContext): Promise<boolean> {

    if (context.request?.rawBody) {

      const contentType = context.request.contentType;
      const requestBodyLines = await this.normalizeBody(context.request.rawBody, context);
      if (requestBodyLines.length > 0) {
        if (isMimeTypeFormUrlEncoded(contentType)) {
          context.request.body = this.formUrlEncodedJoin(requestBodyLines);
        } else {
          if (requestBodyLines.every(obj => isString(obj)) && isMimeTypeNewlineDelimitedJSON(contentType)) {
            requestBodyLines.push('');
          }

          const body: Array<HttpRequestBodyLine> = [];
          const strings: Array<string> = [];
          const lineEnding = isMimeTypeMultiPartFormData(contentType) ? '\r\n' : EOL;

          for (const line of requestBodyLines) {
            if (isString(line)) {
              strings.push(line);
            } else {
              if (strings.length > 0) {
                strings.push(lineEnding);
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

  private async normalizeBody(rawBody: Array<string | RequestBodyImport>, context: ProcessorContext) {
    const result: Array<HttpRequestBodyLine> = [];
    const forceInjectVariables = (filename: string) => {
      if (context.httpRegion.metaData.injectVariables) {
        return true;
      }
      if (context.config?.requestBodyInjectVariablesExtensions) {
        const extname = fileProvider.extname(filename);
        return context.config.requestBodyInjectVariablesExtensions
          .indexOf(extname) >= 0;
      }
      return false;
    };

    for (const line of rawBody) {
      if (isString(line)) {
        result.push(line);
      } else {
        const normalizedPath = await toAbsoluteFilename(line.fileName, context.httpFile.fileName);
        if (normalizedPath) {
          if (forceInjectVariables(line.fileName) || line.injectVariables) {
            result.push(await fileProvider.readFile(normalizedPath, line.encoding));
          } else {
            result.push(async () => fileProvider.readBuffer(normalizedPath));
          }
        } else {
          userInteractionProvider.showWarnMessage?.(`request body file ${line.fileName} not found`);
          log.warn(`request body file ${line.fileName} not found`);
        }
      }
    }
    return result;
  }

  private formUrlEncodedJoin(body: Array<HttpRequestBodyLine>): string {
    const result = body.reduce((previousValue, currentValue, currentIndex) => {
      let prev = previousValue;
      if (isString(currentValue)) {
        prev += `${(currentIndex === 0 || currentValue.startsWith('&') ? '' : EOL)}${currentValue}`;
      }
      return prev;
    }, '');
    if (isString(result)) {
      return result;
    }
    return '';
  }
}
