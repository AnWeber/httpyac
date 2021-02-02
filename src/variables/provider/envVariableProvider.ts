import { dirname } from 'path';
import { EnvironmentProvider, HttpFile, VariableProvider } from '../../models';

export class EnvVariableProvider<T extends EnvironmentProvider> implements VariableProvider {

  private paths: Record<string, T> = {};
  constructor(private readonly factory: (path: string) => T,
    private readonly ignorePaths: Array<string>) { }

  reset() {
    for (const [, envProvider] of Object.entries(this.paths)) {
      if (envProvider.reset) {
        envProvider.reset();
      }
    }
    this.paths = {};
  }


  async getEnvironments?(httpFile: HttpFile): Promise<string[]> {
    const basePath = dirname(httpFile.fileName);
    if (this.ignorePaths.indexOf(basePath) >= 0) {
      return [];
    }
    const envProvider = this.getEnvProvider(basePath);
    return await envProvider.getEnvironments();
  }

  async getVariables(env: string[] | undefined, httpFile: HttpFile): Promise<Record<string, any>> {
    const basePath = dirname(httpFile.fileName);
    if (this.ignorePaths.indexOf(basePath) >= 0) {
      return {};
    }
    const envProvider = this.getEnvProvider(basePath);
    if (env) {
      return Object.assign({}, ...await Promise.all(env.map(obj => envProvider.getVariables(obj))));
    }
    return envProvider.getVariables(env);
  }

  private getEnvProvider(basePath: string) : T{
    let envProvider: T = this.paths[basePath];
    if (!envProvider) {
      envProvider = this.factory(basePath);
      this.paths[basePath] = envProvider;
    }
    return envProvider;
  }
}