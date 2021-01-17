import { EnvironmentProvider } from '../models';

const DEFAULT_ENV = "$shared";
export class JsonEnvProvider implements EnvironmentProvider{


  constructor(private readonly cache: Record<string, Record<string,any>>) { }

  async getEnvironments(): Promise<string[]> {
    return Promise.resolve(Object.entries(this.cache)
      .filter(([key]) => key !== DEFAULT_ENV)
      .map(([key]) => key));
  }
  async getVariables(env: string): Promise<Record<string, any>> {
    return Promise.resolve(Object.assign({}, this.cache[DEFAULT_ENV] || {}, this.cache[env] || {}));
  }
}