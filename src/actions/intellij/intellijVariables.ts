import { ProcessorContext } from '../../models';
import * as utils from '../../utils';
import { intellijVariableCache } from '../../variables/provider';
import { Variables as JetbrainsVariables } from './http-client';

export class IntellijVariables implements JetbrainsVariables {
  constructor(private readonly context: ProcessorContext) {}

  private get globalCache() {
    return intellijVariableCache[utils.toEnvironmentKey(this.context.httpFile.activeEnvironment)];
  }

  set(varName: string, varValue: string): void {
    this.globalCache[varName] = varValue;
    utils.setVariableInContext(
      {
        [varName]: varValue,
      },
      this.context
    );
  }
  get(varName: string): unknown {
    return this.context.variables[varName];
  }
  isEmpty(): boolean {
    return Object.entries(this.globalCache).length === 0;
  }
  clear(varName: string): void {
    delete this.globalCache[varName];
    utils.deleteVariableInContext(varName, this.context);
  }
  clearAll(): void {
    for (const [key] of Object.entries(this.globalCache)) {
      this.clear(key);
    }
  }
}
