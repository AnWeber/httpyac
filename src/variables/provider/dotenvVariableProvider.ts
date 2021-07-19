import { fileProvider, log, PathLike } from '../../io';
import { VariableProvider, VariableProviderContext, Variables } from '../../models';
import { parse } from 'dotenv';
import { expandVariables, toAbsoluteFilename } from '../../utils';

export class DotenvVariableProvider implements VariableProvider {
  private readonly defaultFiles: Array<string> = ['.env'];

  async getEnvironments(context: VariableProviderContext): Promise<string[]> {
    try {
      const files: Array<string> = [];

      if (context.httpFile.rootDir) {
        files.push(...await fileProvider.readdir(context.httpFile.rootDir));
      }
      if (context.config?.envDirName) {
        const absolute = await toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir, true);
        if (absolute) {
          files.push(...await fileProvider.readdir(absolute));
        }
      }

      return files
        .filter(file => file.startsWith('.env') || file.endsWith('.env'))
        .filter(fileName => this.defaultFiles.indexOf(fileName) < 0)
        .map(fileName => {
          if (fileName.startsWith('.env')) {
            return fileName.slice(5);
          }
          return fileName.slice(0, fileName.length - 4);
        });
    } catch (err) {
      log.trace(err);
    }
    return [];
  }

  async getVariables(env: string[] | undefined, context: VariableProviderContext): Promise<Variables> {
    const searchFiles = this.getSearchFiles(env);
    const variables: Array<Variables> = [];

    if (context.httpFile.rootDir) {
      variables.push(...await this.getVariablesOfFolder(searchFiles, context.httpFile.rootDir));
    }
    if (context.config?.envDirName) {
      const absolute = await toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir, true);
      if (absolute) {
        variables.push(...await this.getVariablesOfFolder(searchFiles, absolute));
      }
    }
    const result = Object.assign({}, ...variables);
    return expandVariables(result);
  }

  private getSearchFiles(env: string[] | undefined) {
    const searchFiles = [...this.defaultFiles];
    if (env) {
      for (const environment of env) {
        searchFiles.push(`${environment}.env`, `.env.${environment}`);
      }
    }
    return searchFiles;
  }

  private async getVariablesOfFolder(searchFiles: string[], workingDir: PathLike) {
    const files = await fileProvider.readdir(workingDir);
    const foundFiles = searchFiles.filter(file => files.indexOf(file) >= 0);
    const vars = [];
    for (const fileName of foundFiles) {
      const envFileName = fileProvider.joinPath(workingDir, fileName);
      try {
        const content = await fileProvider.readFile(envFileName, 'utf-8');
        const variables = parse(content);
        vars.push(variables);
      } catch (err) {
        log.trace(err);
      }
    }
    return vars;
  }
}
