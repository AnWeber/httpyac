import { HttpRegion, HttpFile } from '../httpRegion';
import { isString } from '../utils';
import {executeScript} from './jsActionProcessor';
import { EOL } from 'os';

export async function variableReplaceActionProcessor(data: unknown, httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>): Promise<void> {
  if (httpRegion.request) {
    await replaceVariablesInRequest(httpRegion, httpFile, variables);
  }
};


async function replaceVariablesInRequest(httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) {

  const replacer = (value: string) => replaceVariables(value, httpFile,httpRegion, variables);
  if (httpRegion.request) {
    httpRegion.request.url = await replacer(httpRegion.request.url);
  }
  if (httpRegion.request?.headers) {
    for (const [headerName, headerValue] of Object.entries(httpRegion.request?.headers)) {
      if (isString(headerValue)) {
        httpRegion.request.headers[headerName] = await replacer(headerValue);
      }
    }
  }
  if (httpRegion.request?.body) {
    if (isString(httpRegion.request?.body)) {
      httpRegion.request.body = await replacer(httpRegion.request.body);
    } else if(Array.isArray(httpRegion.request.body)) {
      const replacedBody: Array<string | (() => Promise<Buffer>)> = [];
      for (const obj of httpRegion.request.body) {
        if (isString(obj)) {
          replacedBody.push(await replacer(obj));
        } else {
          replacedBody.push(obj);
        }
      }
      httpRegion.request.body = replacedBody;
    }
  }
}

async function replaceVariables(text: string, httpFile: HttpFile, httpRegion: HttpRegion, variables: Record<string,any>) {
  const variableRegex = /\{{2}(.+?)\}{2}/g;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const searchValue = match[0];
    const script = `exports.$result = (${match[1]});`;

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