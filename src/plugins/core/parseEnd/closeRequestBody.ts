import { fileProvider } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';

export async function closeRequestBody(context: models.ParserContext): Promise<void> {
  const requestBody = getAndRemoveRequestBody(context);
  if (context.httpRegion.request && !!requestBody) {
    const request = context.httpRegion.request;
    removeTrailingEmptyLines(requestBody.rawBody);

    const requestBodyLines = await toHttpRequestBodyLineArray(requestBody.rawBody);
    if (requestBodyLines.length > 0) {
      if (utils.isMimeTypeFormUrlEncoded(request.contentType)) {
        request.body = formUrlEncodedJoin(requestBodyLines);
      } else {
        addLineForNewlineDelimitedJSON(requestBodyLines, request);
        request.body = concatStrings(requestBodyLines, request.contentType);
      }
    }
  }
}

function concatStrings(requestBodyLines: models.HttpRequestBodyLine[], contentType: models.ContentType | undefined) {
  const body: Array<models.HttpRequestBodyLine> = [];
  const strings: Array<string> = [];
  const lineEnding = utils.isMimeTypeMultiPartFormData(contentType) ? '\r\n' : fileProvider.EOL;

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
    return strings.join(lineEnding);
  }
  if (strings.length > 0) {
    body.push(strings.join(lineEnding));
  }
  return body;
}

function getAndRemoveRequestBody(context: models.ParserContext) {
  const result = context.data.request_body;
  if (result) {
    delete context.data.request_body;
  }
  return result;
}

function addLineForNewlineDelimitedJSON(
  requestBodyLines: models.HttpRequestBodyLine[],
  request: models.Request<string>
) {
  if (requestBodyLines.every(obj => utils.isString(obj)) && utils.isMimeTypeNewlineDelimitedJSON(request.contentType)) {
    requestBodyLines.push('');
  }
}

function removeTrailingEmptyLines(lines: Array<unknown>): void {
  while (lines.length > 0 && utils.isStringEmpty(lines[lines.length - 1])) {
    lines.pop();
  }
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (utils.isString(lastLine)) {
      if (/\s*<--->\s*/u.test(lastLine)) {
        lines.pop();
      }
    }
  }
}

async function toHttpRequestBodyLineArray(rawBody: Array<string | models.RequestBodyImport>) {
  const result: Array<models.HttpRequestBodyLine> = [];
  for (const line of rawBody) {
    if (utils.isString(line)) {
      result.push(line);
    } else {
      const { injectVariables, fileName } = line;
      const forceInjectVariables = (file: string, context: models.ProcessorContext) => {
        if (context.httpRegion.metaData.injectVariables) {
          return true;
        }
        if (context.config?.requestBodyInjectVariablesExtensions) {
          const extname = utils.extensionName(file);
          if (extname) {
            return context.config.requestBodyInjectVariablesExtensions.indexOf(extname) >= 0;
          }
        }
        return false;
      };
      result.push(
        async (context: models.ProcessorContext) =>
          await utils.replaceFilePath(fileName, context, async (path: models.PathLike) => {
            if (injectVariables || forceInjectVariables(line.fileName, context)) {
              return await fileProvider.readFile(path, line.encoding);
            }
            return fileProvider.readBuffer(path);
          })
      );
    }
  }
  return result;
}

function formUrlEncodedJoin(body: Array<models.HttpRequestBodyLine>): string {
  const result = body.reduce((previousValue, currentValue, currentIndex) => {
    let prev = previousValue;
    if (utils.isString(currentValue)) {
      prev += `${currentIndex === 0 || currentValue.startsWith('&') ? '' : fileProvider.EOL}${currentValue}`;
    }
    return prev;
  }, '');
  if (utils.isString(result)) {
    return result;
  }
  return '';
}
