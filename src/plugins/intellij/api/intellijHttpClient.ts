import { ok } from 'assert';

import * as models from '../../../models';
import { testFactory } from '../../../utils';
import { HttpClient, Variables } from './stubs';
import { IntellijVariables } from './intellijVariables';

export class IntellijHttpClient implements HttpClient {
  global: Variables;
  constructor(private readonly context: models.ProcessorContext) {
    this.global = new IntellijVariables(context);
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
  exit(): void {
    this.context.scriptConsole?.warn('exit not supported');
  }
}
