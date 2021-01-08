import { EnvironmentProvider } from './environmentProvider';

const DEFAULT_ENV = "$SHARED";
export class JsonEnvProvider implements EnvironmentProvider{


  constructor(private readonly cache: Record<string, Record<string,any>>) { }

  async getEnvironments(): Promise<string[]> {
    return Promise.resolve(Object.entries(this.cache).map(obj => obj[0]));
  }
  async getVariables(env: string): Promise<Record<string, any>> {
    return Promise.resolve(Object.assign({}, this.cache[DEFAULT_ENV] || {}, this.cache[env] || {}));
  }
}