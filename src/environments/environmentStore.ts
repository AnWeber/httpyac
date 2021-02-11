import { ENVIRONMENT_NONE, isString } from '../utils';
import { Variables, EnvironmentProvider, HttpFile } from '../models';
import {httpYacApi} from '../httpYacApi';

class EnvironmentStore{
  activeEnvironments: Array<string>| undefined;
  readonly environmentProviders: Array<EnvironmentProvider> = [];

  private environments: Record<string, Variables> = {};

  public additionalResets: Array<() => void> = [];


  async reset() {
    this.environments = {};
    for (const variableProvider of httpYacApi.variableProviders) {
      if (variableProvider.reset) {
        variableProvider.reset();
      }
    }
    for (const envProvider of this.environmentProviders) {
      if (envProvider.reset) {
        envProvider.reset();
      }
    }

    for (const reset of this.additionalResets) {
      reset();
    }
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
    const variables: Variables = Object.assign({}, ...result);

    this.expandVariables(variables);
    return variables;
  }

  private expandVariables(variables: Variables) {
    for (const [key, value] of Object.entries(variables)) {
      this.expandVar(key, value, variables);
    }
  }

  private expandVar(key: string, value: any, variables: Record<string, any>) {
    if (value && isString(value)) {
      let match: RegExpExecArray | null;
      const variableRegex = /\{{2}([a-zA-Z0-9_]+)\}{2}/g;
      while ((match = variableRegex.exec(value)) !== null) {
        const [searchValue, variableName] = match;
        const val = this.expandVar(variableName, variables[variableName], variables);
        value = value.replace(searchValue, val);
      }
    }
    variables[key] = value;
    return value;
  }

  async getEnviroments(httpFile: HttpFile | undefined): Promise<Array<string> | null> {
    const result = await Promise.all(this.environmentProviders.map(obj => obj.getEnvironments()));

    if (httpFile) {
      for (const variableProvider of httpYacApi.variableProviders) {
        if (variableProvider.getEnvironments) {
          result.push(await variableProvider.getEnvironments(httpFile));
        }
      }
    }

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