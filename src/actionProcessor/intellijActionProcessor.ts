import { Variables, ProcessorContext } from '../models';
import { ScriptData, executeScript } from './jsActionProcessor';
import { ok } from 'assert';
import { log } from '../logger';


export async function intellijActionProcessor(scriptData: ScriptData, {httpRegion, httpFile, variables}: ProcessorContext) {
  variables.httpRegion = httpRegion;


  const response = httpRegion.response ? {
    body: httpRegion.response.body,
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
  }: undefined;
  const client = new HttpClient(variables);
  const intellijVars = {
    client,
    response,
  };
  await executeScript(scriptData.script, httpFile.fileName, intellijVars, scriptData.lineOffset + 1);
  return true;
}

export class HttpClient{
  global: HttpClientVariables;

  constructor(variables: Variables) {
    this.global = new HttpClientVariables(variables);
  }


  test(testName: string, func: Function): void{
    try {
      func();
      log.trace(`${testName} erfolgreich ausgeführt`);
    } catch (err) {
      log.debug(testName, err);
      throw err;
    }
  }
  assert(condition: boolean, message?: string) {
    ok(condition, message);
  }
  log(text: string): void{
    log.info(text);
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