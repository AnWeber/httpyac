import { EnvironmentProvider } from './environmentProvider';
import { trace } from '../utils';

const ENVIRONMENT_NONE = '__NONE__';
class EnvironmentStore{
  activeEnv: string| undefined;
  readonly environmentProviders: Array<EnvironmentProvider> = [];

  private variables: Record<string, Array<Record<string, any>>> = {};


  async refresh() {
    this.variables = {};
  }



  @trace()
  async getVariables(env: string | undefined) {
    let result = this.variables[env || ENVIRONMENT_NONE];
    if (!result) {
      result = await Promise.all(this.environmentProviders.map(obj => obj.getVariables(env)));
      this.variables[env || ENVIRONMENT_NONE] = result;
    }
    return result;
  }

  @trace()
  async getEnviroments(): Promise<Array<string> | null> {
    const result = await Promise.all(this.environmentProviders.map(obj => obj.getEnvironments()));
    if (result && result.length > 0) {
      return result.reduce((prev, current) => {
        for (const env of current) {
          if (prev.indexOf(env) < 0) {
            prev.push(env);
          }
        }
        return prev;
      }).sort();
    }
    return null;
  }

  toString() {
    return 'environmentStore';
  }
}

export const environmentStore = new EnvironmentStore();