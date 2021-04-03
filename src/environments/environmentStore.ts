import { ENVIRONMENT_NONE, isString } from '../utils';
import { Variables, EnvironmentProvider, HttpFile, EnvironmentConfig, UserSession, HttpClient, ClientCertificateOptions } from '../models';
import {httpYacApi} from '../httpYacApi';
import { JsonEnvProvider } from './jsonEnvProvider';
import { EnvVariableProvider } from '../variables/provider/envVariableProvider';
import { IntellijProvider } from './intellijEnvProvider';
import { DotenvProvider } from './dotenvProvider';
import { log, logRequest } from '../logger';

class EnvironmentStore{
  activeEnvironments: Array<string>| undefined;
  readonly clientCertificates?: Record<string, ClientCertificateOptions> = {};
  readonly environmentProviders: Array<EnvironmentProvider> = [];

  private environments: Record<string, Variables> = {};


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
      this.expandVariable(key, value, variables);
    }
  }

  private expandVariable(key: string, value: any, variables: Record<string, any>) {
    if (value && isString(value)) {
      let match: RegExpExecArray | null;
      const variableRegex = /\{{2}([a-zA-Z0-9_]+)\}{2}/g;
      while ((match = variableRegex.exec(value)) !== null) {
        const [searchValue, variableName] = match;
        const val = this.expandVariable(variableName, variables[variableName], variables);
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

  async configure(config: EnvironmentConfig): Promise<Dispose> {
    if (config.log) {
      if (config.log.level) {
        log.level = config.log.level;
      }
      logRequest.supportAnsiColors = !!config.log.supportAnsiColors;
      logRequest.logResponseBodyLength = config.log.responseBodyLength || 0;
      logRequest.isRequestLogEnabled = !!config.log.isRequestLogEnabled;
      logRequest.prettyPrint = !!config.log.prettyPrint;
    }
    Object.assign(this.clientCertificates, config.clientCertificates);

    const environmentProviders: Array<EnvironmentProvider> = [];
    if (config.environments) {
      environmentProviders.push(new JsonEnvProvider(config.environments));
    }
    environmentProviders.push(...this.initIntellijProviders(config));
    environmentProviders.push(...this.initDotenvProviders(config));

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

  private initIntellijProviders(config: EnvironmentConfig) {
    const result = [];
    if (config.intellij) {
      const factory = (path: string) => new IntellijProvider(path);
      for (const dir of config.intellij.dirs) {
        result.push(factory(dir));
      }
      if (config.intellij.variableProviderEnabled) {
        httpYacApi.variableProviders.splice(0, 0, new EnvVariableProvider(factory, config.intellij.dirs));
      }
    }
    return result;
  }


  private initDotenvProviders(config: EnvironmentConfig) {
    const result = [];
    if (config.dotenv) {
      const factory = (path: string) => new DotenvProvider(path, config.dotenv?.defaultFiles || ['.env']);
      for (const dir of config.dotenv.dirs) {
        result.push(factory(dir));
      }
      if (config.dotenv.variableProviderEnabled) {
        httpYacApi.variableProviders.splice(0, 0, new EnvVariableProvider(factory, config.dotenv.dirs));
      }
    }
    return result;
  }


}

type Dispose = () => void;

export const environmentStore = new EnvironmentStore();