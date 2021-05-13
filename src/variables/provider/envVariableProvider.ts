import { fileProvider, PathLike } from '../../fileProvider';
import { EnvironmentProvider, HttpFile, VariableProvider, Variables } from '../../models';

export class EnvVariableProvider<T extends EnvironmentProvider> implements VariableProvider {

  private paths: Record<string, T> = {};
  constructor(private readonly factory: (path: PathLike) => T,
    private readonly ignorePaths: Array<PathLike>) { }

  reset(): void {
    for (const [, envProvider] of Object.entries(this.paths)) {
      if (envProvider.reset) {
        envProvider.reset();
      }
    }
    this.paths = {};
  }


  async getEnvironments?(httpFile: HttpFile): Promise<string[]> {
    const basePath = fileProvider.dirname(httpFile.fileName);
    if (this.ignorePaths.indexOf(basePath) >= 0) {
      return [];
    }
    const envProvider = this.getEnvProvider(basePath);
    return await envProvider.getEnvironments();
  }

  async getVariables(env: string[] | undefined, httpFile: HttpFile): Promise<Variables> {
    const basePath = fileProvider.dirname(httpFile.fileName);
    if (this.ignorePaths.indexOf(basePath) >= 0) {
      return {};
    }
    const envProvider = this.getEnvProvider(basePath);
    if (env) {
      return Object.assign({}, ...await Promise.all(env.map(obj => envProvider.getVariables(obj))));
    }
    return envProvider.getVariables(env);
  }

  private getEnvProvider(basePath: PathLike): T {
    const cacheKey = fileProvider.toString(basePath);
    let envProvider: T = this.paths[cacheKey];
    if (!envProvider) {
      envProvider = this.factory(basePath);
      this.paths[cacheKey] = envProvider;
    }
    return envProvider;
  }
}
