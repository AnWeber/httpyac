import { ENVIRONMENT_NONE, getHttpacJsonConfig, isString, toAbsoluteFilename } from '../utils';
import { Variables, EnvironmentProvider, HttpFile, EnvironmentConfig } from '../models';
import { httpYacApi } from '../httpYacApi';
import { JsonEnvProvider } from './jsonEnvProvider';
import { EnvVariableProvider } from '../variables/provider/envVariableProvider';
import { IntellijProvider } from './intellijEnvProvider';
import { DotenvProvider } from './dotenvProvider';
import { log, logRequest, LogLevel } from '../logger';
import { fileProvider, PathLike } from '../fileProvider';
import merge from 'lodash/merge';

class EnvironmentStore {
  activeEnvironments: Array<string>| undefined;
  readonly environmentProviders: Array<EnvironmentProvider> = [];

  private environments: Record<string, Variables> = {};

  environmentConfig?: EnvironmentConfig;

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

  async getVariables(environments: string[] | undefined): Promise<Variables> {
    const result: Array<Variables> = [];

    if (environments && environments.length > 0) {
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

  private expandVariable(key: string, value: unknown, variables: Variables) {
    if (value && isString(value)) {
      let result = value;
      let match: RegExpExecArray | null;
      const variableRegex = /\{{2}([a-zA-Z0-9_]+)\}{2}/gu;
      while ((match = variableRegex.exec(result)) !== null) {
        const [searchValue, variableName] = match;
        const val = this.expandVariable(variableName, variables[variableName], variables);
        result = result.replace(searchValue, `${val}`);
      }
      variables[key] = result;
    } else {
      variables[key] = value;
    }
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


  async configure(rootDirs: PathLike[], config: EnvironmentConfig, defaultOverride: EnvironmentConfig = {}) {
    const defaultConfig: EnvironmentConfig = {
      log: {
        level: LogLevel.warn,
        responseBodyLength: 0,
        isRequestLogEnabled: true,
        supportAnsiColors: true,
        prettyPrint: true,
      },
      cookieJarEnabled: true,
      dotenv: {
        enabled: true,
        defaultFiles: ['.env'],
        dirname: 'env',
      },
      intellij: {
        enabled: true,
      },
    };
    const environmentConfig: EnvironmentConfig = merge(
      defaultConfig,
      defaultOverride,
      ...(await this.loadFileEnvironemntConfigs(rootDirs)),
      config
    );

    this.initLogConfiguration(environmentConfig);
    await this.searchClientCertficates(environmentConfig, rootDirs);

    this.environmentConfig = environmentConfig;
    return this.initEnvProviders(environmentConfig, rootDirs);
  }


  private async searchClientCertficates(environmentConfig: EnvironmentConfig, rootDirs: PathLike[]) {
    if (environmentConfig.clientCertificates) {
      for (const [, value] of Object.entries(environmentConfig.clientCertificates)) {
        value.cert = await this.findFileName(value.cert, rootDirs);
        value.key = await this.findFileName(value.key, rootDirs);
        value.pfx = await this.findFileName(value.pfx, rootDirs);
      }
    }
  }

  private async loadFileEnvironemntConfigs(rootDirs: PathLike[]): Promise<Array<EnvironmentConfig>> {
    const environmentConfigs: Array<EnvironmentConfig> = [];
    for (const rootDir of rootDirs) {
      const environmentConfig = await getHttpacJsonConfig(rootDir);
      if (environmentConfig) {
        environmentConfigs.push(environmentConfig);
      }
    }

    return environmentConfigs;
  }


  private async findFileName(fileName: PathLike | undefined, rootDirs: PathLike[]): Promise<PathLike | undefined> {
    if (fileName) {
      if (fileProvider.isAbsolute(fileName)) {
        return fileName;
      }
      if (isString(fileName)) {
        for (const rootDir of rootDirs) {
          const absolute = await toAbsoluteFilename(fileName, rootDir, true);
          if (absolute) {
            return absolute;
          }
        }
      }
    }
    return fileName;
  }


  private initLogConfiguration(config: EnvironmentConfig) {
    if (config.log) {
      if (config.log.level !== undefined) {
        log.level = config.log.level;
      }
      logRequest.logResponseBodyLength = config.log.responseBodyLength || 0;
      logRequest.isRequestLogEnabled = !!config.log.isRequestLogEnabled;
      logRequest.prettyPrint = !!config.log.prettyPrint;
    }
  }

  private async initEnvProviders(config: EnvironmentConfig, rootDirs: PathLike[]): Promise<Dispose> {

    const environmentProviders: Array<EnvironmentProvider> = [];
    if (config.environments) {
      environmentProviders.push(new JsonEnvProvider(config.environments));
    }
    environmentProviders.push(...this.initEnvProvider((path: PathLike) => new IntellijProvider(path), config.intellij, rootDirs));
    environmentProviders.push(...this.initEnvProvider((path: PathLike) => new DotenvProvider(path, config.dotenv?.defaultFiles), config.dotenv, rootDirs));

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

  private initEnvProvider(factory: (path: PathLike) => EnvironmentProvider, config: {
    enabled?: boolean;
    dirname?: string;
    variableProviderEnabled?: boolean;
  } | undefined, rootDirs: PathLike[]) {
    const result = [];
    if (config?.enabled) {
      for (const rootDir of rootDirs) {
        result.push(factory(rootDir));
        if (config.dirname && !fileProvider.isAbsolute(config.dirname)) {
          result.push(factory(fileProvider.joinPath(rootDir, config.dirname)));
        }
      }
      if (config.dirname && fileProvider.isAbsolute(config.dirname)) {
        result.push(factory(config.dirname));
      }
      if (config.variableProviderEnabled) {
        httpYacApi.variableProviders.splice(0, 0, new EnvVariableProvider(factory, rootDirs));
      }
    }
    return result;
  }
}

type Dispose = () => void;

export const environmentStore = new EnvironmentStore();
