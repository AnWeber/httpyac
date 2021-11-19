import { ProcessorContext } from '../../models';
import { testFactory } from '../testMethod';
import { HttpClient as JetbrainsHttpClient, Variables as JetbrainsVariables } from './http-client';
import { IntellijVariables } from './intellijVariables';
import { ok } from 'assert';

export class IntellijHttpClient implements JetbrainsHttpClient {
  global: JetbrainsVariables;
  constructor(private readonly context: ProcessorContext) {
    this.global = new IntellijVariables(context.variables, context.httpFile.activeEnvironment);
  }
  test(testName: string, func: () => void): void {
    testFactory(this.context)(testName, func);
  }
  assert(condition: boolean, message?: string): void {
    ok(condition, message);
  }
  log(text: string): void {
    if (this.context.scriptConsole) {
      this.context.scriptConsole.info(text);
    }
  }
}
