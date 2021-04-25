import { ok } from 'assert';
import { scriptConsole } from '../../logger';
import { HttpRegion, Variables } from '../../models';
import { testFactory } from '../testMethod';
import { HttpClient as JetbrainsHttpClient, Variables as JetbrainsVariables } from './http-client';
import { IntellijVariables } from './intellijVariables';

export class IntellijHttpClient implements JetbrainsHttpClient {
  global: JetbrainsVariables;
  constructor(private readonly httpRegion: HttpRegion, variables: Variables, env: string[] | undefined) {
    this.global = new IntellijVariables(variables, env);
  }
  test(testName: string, func: () => void): void {
    testFactory(this.httpRegion)(testName, func);
  }
  assert(condition: boolean, message?: string) : void {
    ok(condition, message);
  }
  log(text: string): void {
    scriptConsole.info(text);
  }
}
