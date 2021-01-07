import { EOL } from 'os';
import { HttpRegion, HttpFile } from '../httpRegion';
import {responseToString, requestToString, timingsToString } from './requestUtils';

export async function sendHttpRegion(httpRegion: HttpRegion, httpFile: HttpFile, variables: Record<string, any>) {
  if (!httpRegion.disabled) {
    for (const prevHttpRegion of httpFile.httpRegions) {
      if (prevHttpRegion === httpRegion) {
        break;
      }
      if (!prevHttpRegion.request && !prevHttpRegion.disabled) {
        await processHttpRegionActions(prevHttpRegion, httpFile, variables);
      }
    }
    await processHttpRegionActions(httpRegion, httpFile, variables);
  }
}

export async function sendHttpFile(httpFile: HttpFile, variables: Record<string,any>) {
  for (const httpRegion of httpFile.httpRegions) {
    if (!httpRegion.disabled) {
      await processHttpRegionActions(httpRegion, httpFile, variables);
    }
  }
}

async function processHttpRegionActions(httpRegion: HttpRegion<unknown>, httpFile: HttpFile, variables: Record<string, any>) {
  for (const action of httpRegion.actions) {
    if (!httpRegion.disabled) {
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
  }
  if (httpRegion.request) {
    result.push(`)
---
### request
${requestToString(httpRegion.request)}
        `);
  }
  return result.join(EOL).split(EOL).join(`  ${EOL}`);
}
