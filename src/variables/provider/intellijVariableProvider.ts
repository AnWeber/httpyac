import { fileProvider, log, PathLike } from '../../io';
import { VariableProvider, VariableProviderContext, Variables } from '../../models';
import { expandVariables, toAbsoluteFilename } from '../../utils';

export class IntellijVariableProvider implements VariableProvider {
  private readonly defaultFiles: Array<string> = ['http-client.env.json', 'http-client.private.env.json'];

  async getEnvironments(context: VariableProviderContext): Promise<string[]> {
    try {
      const environments = await this.getAllEnvironmentVariables(context);

      return environments
        .reduce((prev, current) => {
          for (const [env] of Object.entries(current)) {
            prev.push(env);
          }
          return prev;
        }, [] as Array<string>);
    } catch (err) {
      log.trace(err);
    }
    return [];
  }

  private async getAllEnvironmentVariables(context: VariableProviderContext) {
    const environments: Array<Record<string, Variables>> = [];

    if (context.httpFile.rootDir) {
      await this.getEnvironmentVariables(context.httpFile.rootDir);
    }
    if (context.config?.envDirName) {
      const absolute = await toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir, true);
      if (absolute) {
        environments.push(...await this.getEnvironmentVariables(absolute));
      }
    }
    return environments;
  }

  async getVariables(envs: string[] | undefined, context: VariableProviderContext): Promise<Variables> {
    const environments = await this.getAllEnvironmentVariables(context);
    const variables: Array<Variables> = [];
    if (envs) {
      for (const env of envs) {
        variables.push(...environments
          .filter(obj => !!obj[env])
          .map(obj => obj[env]));
      }
    }
    return expandVariables(Object.assign({}, ...variables));
  }

  private async getEnvironmentVariables(workingDir: PathLike) {
    const environments: Array<Record<string, Variables>> = [];
    for (const file of this.defaultFiles) {
      try {
        const fileName = fileProvider.joinPath(workingDir, file);
        if (fileProvider.exists(fileName)) {
          const content = await fileProvider.readFile(fileName, 'utf-8');
          environments.push(JSON.parse(content));
        }
      } catch (err) {
        log.trace(err);
      }
    }
    return environments;
  }
}
