import { Variables, ProcessorContext, HttpRegion, HttpFile } from '../models';
import { ScriptData, executeScript } from './jsActionProcessor';
import { ok } from 'assert';
import { log, console, popupService } from '../logger';
import { toAbsoluteFilename, isMimeTypeJSON, isString } from '../utils';
import { promises as fs } from 'fs';

export interface IntellijScriptData{
  fileName: string;
}

export async function intellijActionProcessor(scriptData: ScriptData | IntellijScriptData, {httpRegion, httpFile, variables}: ProcessorContext) {
  const intellijVars = initIntellijVariables(httpRegion, variables);

  let data: ScriptData;
  if (isIntellijScriptData(scriptData)) {
    const script = await loadScript(scriptData.fileName, httpFile);
    if (!script) {
      return false;
    }
    data = {
      script,
      lineOffset: 0
    };
  } else {
    data = scriptData;
  }
  return await executeScript({ script: data.script, fileName: httpFile.fileName, variables: intellijVars, lineOffset: data.lineOffset + 1 });
}

async function loadScript(file: string, httpFile: HttpFile) {
  try {
    let script: string | false = false;
    const filename = await toAbsoluteFilename(file, httpFile.fileName);
    if (filename) {
      script = await fs.readFile(filename, 'utf-8');
    } else {
      popupService.error(`File not found: ${file}`);
      log.error(`File not found: ${file}`);
    }
    return script;
  } catch (err) {
    popupService.error(`error loading script ${file}`);
    log.error(file, err);
    return false;
  }
}

function isIntellijScriptData(scriptData: any) : scriptData is IntellijScriptData{
  return !!scriptData.fileName;
}

export class HttpClient{
  global: HttpClientVariables;

  constructor(variables: Variables) {
    this.global = new HttpClientVariables(variables);
  }


  test(testName: string, func: Function): void{
    try {
      func();
      console.info(testName);
    } catch (err) {
      console.error(testName);
      throw err;
    }
  }
  assert(condition: boolean, message?: string) {
    try {
      ok(condition, message);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  log(text: string): void{
    console.info(text);
  }
}

class HttpClientVariables{
  constructor(private readonly variables: Variables) { }
  set(varName: string, varValue: string): void{
    this.variables[varName] = varValue;
  }
  get(varName: string): string{
    return this.variables[varName];
  }
  isEmpty(): boolean{
    return Object.entries(this.variables).length === 0;
  }
  clear(varName: string): void{
    delete this.variables[varName];
  }
  clearAll(): void{
    for (const [key] of Object.entries(this.variables)) {
      delete this.variables[key];
    }
  }
}

function initIntellijVariables(httpRegion: HttpRegion<any>, variables: Record<string, any>) {
  let response: any = undefined;
  if (httpRegion.response) {
    response = {
      body: isMimeTypeJSON(httpRegion.response.contentType) && isString(httpRegion.response.body) ? JSON.parse(httpRegion.response.body) : httpRegion.response.body,
      headers: {
        valueOf: (headerName: string) => {
          if (httpRegion.response) {
            return httpRegion.response.headers[headerName];
          }
          return undefined;
        },
        valuesOf: (headerName: string) => {
          if (httpRegion.response) {
            return [httpRegion.response.headers[headerName]];
          }
          return undefined;
        }
      },
      status: httpRegion.response.statusCode,
      contentType: httpRegion.response.contentType,
    };
  }
  const client = new HttpClient(variables);
  const intellijVars = {
    client,
    response,
  };
  return intellijVars;
}
