import { Variables } from '../../models';
import { toEnvironmentKey } from '../../utils';
import { intellijVariableCache } from '../../variables/provider';
import { Variables as JetbrainsVariables } from './http-client';

export class IntellijVariables implements JetbrainsVariables {
  constructor(private readonly variables: Variables, private readonly env: string[] | undefined) {}

  private get globalCache() {
    return intellijVariableCache[toEnvironmentKey(this.env)];
  }

  set(varName: string, varValue: string): void {
    this.globalCache[varName] = varValue;
    this.variables[varName] = varValue;
  }
  get(varName: string): unknown {
    return this.variables[varName];
  }
  isEmpty(): boolean {
    return Object.entries(this.globalCache).length === 0;
  }
  clear(varName: string): void {
    delete this.globalCache[varName];
    delete this.variables[varName];
  }
  clearAll(): void {
    for (const [key] of Object.entries(this.globalCache)) {
      delete this.globalCache[key];
      delete this.variables[key];
    }
  }
}
