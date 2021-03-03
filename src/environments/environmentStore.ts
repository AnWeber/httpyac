import { ENVIRONMENT_NONE, isString } from '../utils';
import { Variables, EnvironmentProvider, HttpFile, EnvironmentConfig, UserSession } from '../models';
import {httpYacApi} from '../httpYacApi';
import { JsonEnvProvider } from './jsonEnvProvider';
import { EnvVariableProvider } from '../variables/provider/envVariableProvider';
import { IntellijProvider } from './intellijEnvProvider';
import { DotenvProvider } from './dotenvProvider';

class EnvironmentStore{
  activeEnvironments: Array<string>| undefined;
  readonly environmentProviders: Array<EnvironmentProvider> = [];

  private environments: Record<string, Variables> = {};
  readonly userSessions: Array<UserSession> = [];


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

    for (const userSession of this.userSessions) {
      if (userSession.logout) {
        userSession.logout();
      }
    }
    this.userSessions.length = 0;
  }

  getUserSession(id: string) {
    return this.userSessions.find(obj => obj.id === id);
  }

  setUserSession(userSession: UserSession) {
    this.removeUserSession(userSession.id);
    this.userSessions.push(userSession);
  }

  removeUserSession(id: string) {
    const userSession = this.userSessions.find(obj => obj.id === id);
    if (userSession) {
      if (userSession.logout) {
        userSession.logout();
      }
      this.userSessions.splice(this.userSessions.indexOf(userSession), 1);
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

  async configure(config: EnvironmentConfig): Promise<Dispose> {

    const environmentProviders: Array<EnvironmentProvider> = [];

    if (config.environments) {
      environmentProviders.push(new JsonEnvProvider(config.environments));
    }

    if (config.intellijDirs) {
      const factory = (path: string) => new IntellijProvider(path);
      for (const dir of config.intellijDirs) {
        environmentProviders.push(factory(dir));
      }
      if (config.intellijVariableProviderEnabled) {
        httpYacApi.variableProviders.splice(0, 0, new EnvVariableProvider(factory, config.intellijDirs));
      }
    }
    if (config.dotenvDirs) {
      const factory = (path: string) => new DotenvProvider(path, config.dotenvDefaultFiles || ['.env']);
      for (const dir of config.dotenvDirs) {
        environmentProviders.push(factory(dir));
      }
      if (config.dotenvVariableProviderEnabled) {
        httpYacApi.variableProviders.splice(0, 0, new EnvVariableProvider(factory, config.dotenvDirs));
      }
    }

    await this.reset();
    this.environmentProviders.push(...environmentProviders);
    return () => {
      for (const envProvider of environmentProviders) {
        if (envProvider.reset) {
          envProvider.reset();
        }
        this.environmentProviders.splice(this.environmentProviders.indexOf(envProvider), 1);
      }
    };
  }
}

type Dispose = () => void;

export const environmentStore = new EnvironmentStore();