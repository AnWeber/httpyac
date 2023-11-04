import { fileProvider } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';
import { replaceVariablesInBody, transformToBufferOrString } from '../request';

export async function closeRequestBody(context: models.ParserContext): Promise<void> {
  const requestBody = getAndRemoveRequestBody(context);
  if (context.httpRegion.request && !!requestBody) {
    const request = context.httpRegion.request;
    removeTrailingEmptyLines(requestBody.rawBody);

    const requestBodyLines = await toHttpRequestBodyLineArray(requestBody.rawBody);
    if (requestBodyLines.length > 0) {
      const requestContents = splitRequestContents(requestBodyLines, request.contentType);
      if (requestContents.length > 0 && !requestContents[0].wait) {
        request.body = requestContents.shift()?.body;
      }
      if (requestContents.length > 0) {
        createStreamingBodySendFactory(requestContents, context);
      }
    }
  }
}

function transformLinesToBody(
  requestBodyLines: models.HttpRequestBodyLine[],
  contentType: models.ContentType | undefined
) {
  if (utils.isMimeTypeFormUrlEncoded(contentType)) {
    return formUrlEncodedJoin(requestBodyLines);
  }
  addLineForNewlineDelimitedJSON(requestBodyLines, contentType);
  return concatStrings(requestBodyLines, contentType);
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
  contentType: models.ContentType | undefined
) {
  if (requestBodyLines.every(obj => utils.isString(obj)) && utils.isMimeTypeNewlineDelimitedJSON(contentType)) {
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

function splitRequestContents(
  requestBodyLines: Array<models.HttpRequestBodyLine>,
  contentType: models.ContentType | undefined
) {
  const store: Array<models.HttpRequestBodyLine> = [];
  const requestContents: Array<RequestContent> = [];
  let wait = false;
  for (const line of requestBodyLines) {
    const match = separatorMatch(line);
    if (match) {
      requestContents.push({
        wait,
        body: transformLinesToBody(store, contentType),
      });
      wait = match.waitForServer;
      store.length = 0;
    } else {
      store.push(line);
    }
  }
  if (store.length > 0) {
    requestContents.push({
      wait,
      body: transformLinesToBody(store, contentType),
    });
  }
  return requestContents;
}

type RequestContent = {
  wait: boolean;
  body?: string | Array<models.HttpRequestBodyLine>;
};

function separatorMatch(line: models.HttpRequestBodyLine) {
  if (utils.isString(line)) {
    const separatorMatch = /\s*={3}\s*(?<wait>wait-for-server)?\s*$/u.exec(line);
    if (separatorMatch) {
      return {
        waitForServer: !!separatorMatch?.groups?.wait,
      };
    }
  }
  return undefined;
}

function createStreamingBodySendFactory(streamingContents: Array<RequestContent>, context: models.ParserContext) {
  context.httpRegion.hooks.onStreaming.addHook('streaming_body', async context => {
    if (context.requestClient) {
      return new Promise<void>(resolve => {
        sendStreamingContents(streamingContents, context, resolve);
      });
    }
    return undefined;
  });
}

async function sendStreamingContents(
  streamingContents: Array<RequestContent>,
  context: models.ProcessorContext,
  resolve: () => void
) {
  let messageWaitCount = 0;
  for (const streamingContent of streamingContents) {
    const isLast = streamingContents.indexOf(streamingContent) === streamingContents.length - 1;
    if (streamingContent.wait) {
      messageWaitCount++;
    }
    if (messageWaitCount === 0) {
      await sendWithRequestClient(streamingContent, context);
      if (isLast) {
        resolve();
      }
    } else {
      let count = 0;
      const messageCount = messageWaitCount;
      context.requestClient?.addEventListener('message', async () => {
        if (++count === messageCount) {
          await sendWithRequestClient(streamingContent, context);
          if (isLast) {
            resolve();
          }
        }
      });
    }
  }
}

async function sendWithRequestClient(streamingContent: RequestContent, context: models.ProcessorContext) {
  await replaceVariablesInBody(streamingContent, context);
  if (streamingContent.body) {
    const body = await transformToBufferOrString(streamingContent.body, context);
    if (body) {
      await context.requestClient?.send(body);
    }
  }
}
