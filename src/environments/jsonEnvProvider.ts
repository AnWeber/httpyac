import { EnvironmentProvider, Variables } from '../models';

const DEFAULT_ENV = '$shared';
export class JsonEnvProvider implements EnvironmentProvider {


  constructor(private readonly cache: Record<string, Variables>) { }

  async getEnvironments(): Promise<string[]> {
    return Promise.resolve(Object.entries(this.cache)
      .filter(([key]) => key !== DEFAULT_ENV)
      .map(([key]) => key));
  }
  async getVariables(env: string): Promise<Variables> {
    return Promise.resolve(Object.assign({}, this.cache[DEFAULT_ENV] || {}, this.cache[env] || {}));
  }
}
