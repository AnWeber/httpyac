import { ENVIRONMENT_NONE } from '../utils';
import { Variables, EnvironmentProvider } from '../models';

class EnvironmentStore{
  activeEnvironments: Array<string>| undefined;
  readonly environmentProviders: Array<EnvironmentProvider> = [];

  private environments: Record<string, Variables> = {};


  async refresh() {
    this.environments = {};
  }

  async getVariables(environments: string[] | undefined): Promise<Record<string, any>> {
    const result: Array<Variables> = [];

    if (environments) {
      for (const env of environments) {
        if (!this.environments[env]) {
          const variables = Object.assign({}, ...(await Promise.all(this.environmentProviders.map(obj => obj.getVariables(env)))));
          this.environments[env] = variables;
          result.push(variables);
        } else {
          result.push(this.environments[env]);
        }
      }
    } else {
      if (!this.environments[ENVIRONMENT_NONE]) {
        const variables = Object.assign({}, ...(await Promise.all(this.environmentProviders.map(obj => obj.getVariables(undefined)))));
        this.environments[ENVIRONMENT_NONE] = variables;
        result.push(variables);
      } else {
        result.push(this.environments[ENVIRONMENT_NONE]);
      }
    }
    return Object.assign({}, ...result);
  }

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