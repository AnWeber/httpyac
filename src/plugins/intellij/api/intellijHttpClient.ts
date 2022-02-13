import { ProcessorContext } from '../../../models';
import { testFactory } from '../../../utils';
import { HttpClient as JetBrainsHttpClient, Variables as JetBrainsVariables } from './http-client';
import { IntellijVariables } from './intellijVariables';
import { ok } from 'assert';

export class IntellijHttpClient implements JetBrainsHttpClient {
  global: JetBrainsVariables;
  constructor(private readonly context: ProcessorContext) {
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
}
