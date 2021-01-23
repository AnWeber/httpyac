import { EOL } from 'os';
import { isString } from './stringUtils';
import { HttpRegion, HttpFile, Variables, ProcessorContext } from '../models';

export async function sendHttpRegion(httpRegion: HttpRegion, httpFile: HttpFile, variables: Variables) {
  if (!httpRegion.metaData.disabled) {
    if (await executeGlobalScripts(httpFile, variables)) {
      return await processHttpRegionActions({ httpRegion, httpFile, variables });
    }
  }
  return false;
}

export async function sendHttpFile(httpFile: HttpFile, variables: Variables) {
  for (const httpRegion of httpFile.httpRegions) {
    if (!httpRegion.metaData.disabled) {
      await processHttpRegionActions({ httpRegion, httpFile, variables });
    }
  }
}

export async function executeGlobalScripts(httpFile: HttpFile, variables: Variables) {
  for (const httpRegion of httpFile.httpRegions) {
    if (!httpRegion.request && !httpRegion.metaData.disabled) {
      if (!await processHttpRegionActions({ httpRegion, httpFile, variables })) {
        return false;
      }
    }
  }
  return true;
}

export async function processHttpRegionActions(context: ProcessorContext) {
  for (const action of context.httpRegion.actions) {
    if (!context.httpRegion.metaData.disabled) {
      if (!await action.processor(action.data, context)) {
        return false;
      }
    }
  }
  return true;
}

