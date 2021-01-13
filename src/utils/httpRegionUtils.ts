import { EOL } from 'os';
import { HttpRegion, HttpFile } from '../httpRegion';
import {responseToString, requestToString, timingsToString } from './requestUtils';

export async function sendHttpRegion(httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) {
  if (!httpRegion.metaParams.disabled) {
    for (const prevHttpRegion of httpFile.httpRegions) {
      if (prevHttpRegion === httpRegion) {
        break;
      }
      if (!prevHttpRegion.request && !prevHttpRegion.metaParams.disabled) {
        await processHttpRegionActions(prevHttpRegion, httpFile, variables);
      }
    }
    await processHttpRegionActions(httpRegion, httpFile, variables);
  }
}

export async function sendHttpFile(httpFile: HttpFile, variables: Record<string,any>) {
  for (const httpRegion of httpFile.httpRegions) {
    if (!httpRegion.metaParams.disabled) {
      await processHttpRegionActions(httpRegion, httpFile, variables);
    }
  }
}

export async function processHttpRegionActions(httpRegion: HttpRegion<unknown>, httpFile: HttpFile, variables: Record<string, any>) {
  for (const action of httpRegion.actions) {
    if (!httpRegion.metaParams.disabled) {
      await action.processor(action.data, httpRegion, httpFile, variables);
    }
  }
}


export function isHttpRegion(obj: any): obj is HttpRegion{
  return obj.actions && obj.position;
}

export function toMarkdown(httpRegion: HttpRegion) {

  const result: Array<string> = [];
  if (httpRegion.response) {
    result.push(`${responseToString(httpRegion.response)}

---
### timings
${timingsToString(httpRegion.response.timings)}
`);

    if (httpRegion.response.request) {
      result.push(`
---
### request
${requestToString(httpRegion.response.request)}
        `);
    }
  }
  return result.join(EOL).split(EOL).join(`  ${EOL}`);
}
