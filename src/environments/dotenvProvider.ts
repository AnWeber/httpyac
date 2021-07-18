import { Variables, EnvironmentProvider } from '../models';
import { parse } from 'dotenv';
import { environmentStore } from './environmentStore';
import { fileProvider, PathLike, WatchDispose, log } from '../io';

function storeReset() {
  environmentStore.reset();
}

export class DotenvProvider implements EnvironmentProvider {

  private watchDisposes: Record<string, WatchDispose> = {};

  constructor(private readonly basepath: PathLike, private readonly defaultFiles: Array<string> = ['.env']) { }

  reset() : void {
    for (const [fileName, watchDispose] of Object.entries(this.watchDisposes)) {
      watchDispose();
      delete this.watchDisposes[fileName];
    }
  }

  async getEnvironments(): Promise<string[]> {
    try {
      const files = await fileProvider.readdir(this.basepath);

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

  async getVariables(env: string): Promise<Variables> {
    const { variables, validFilesNames } = await this.parseDotenv(this.basepath, this.getDotenvFiles(this.defaultFiles, env));
    if (validFilesNames.length > 0) {
      for (const file of validFilesNames) {
        const fileString = fileProvider.toString(file);
        if (!this.watchDisposes[fileString]) {
          this.watchDisposes[fileString] = fileProvider.watchFile(file, storeReset);
        }
      }
    }
    return variables;
  }


  private getDotenvFiles(defaultFiles: Array<string>, env: string | undefined) {
    const files = [...defaultFiles];
    if (env) {
      files.push(`${env}.env`, `.env.${env}`);
    }
    return files;
  }


  private async parseDotenv(dirname: PathLike, fileNames: Array<string>): Promise<{ variables: Variables; validFilesNames: Array<PathLike>; }> {
    const vars: Array<Variables> = [];
    const validFilesNames: Array<PathLike> = [];
    for (const fileName of fileNames) {
      const envFileName = fileProvider.joinPath(dirname, fileName);
      try {
        const content = await fileProvider.readFile(envFileName, 'utf-8');
        const variables = parse(content);
        vars.push(variables);
        validFilesNames.push(envFileName);
      } catch (err) {
        log.trace(err);
      }
    }
    const variables = Object.assign({}, ...vars);
    return { variables, validFilesNames };
  }
}
