import { Variables, EnvironmentProvider } from '../models';
import { environmentStore } from './environmentStore';
import { fileProvider, PathLike, WatchDispose, log } from '../io';

function storeReset() {
  environmentStore.reset();
}


export class IntellijProvider implements EnvironmentProvider {

  private watchDisposes: Record<string, WatchDispose> = {};

  private env: Array<Record<string, Variables>> |undefined;

  constructor(public readonly basepath: PathLike) { }

  reset() : void {
    for (const [fileName, watchDispose] of Object.entries(this.watchDisposes)) {
      watchDispose();
      delete this.watchDisposes[fileName];
    }
  }

  async getEnvironments(): Promise<string[]> {
    const result: string[] = [];
    try {
      const environments = await this.parseIntellijVariables(this.basepath);

      for (const env of environments) {
        for (const item of Object.entries(env).map(([key]) => key)) {
          if (result.indexOf(item) < 0) {
            result.push(item);
          }
        }
      }
    } catch (err) {
      log.trace(err);
    }
    return result;
  }

  async getVariables(env: string): Promise<Variables> {
    const environments = await this.parseIntellijVariables(this.basepath);
    return Object.assign({}, ...environments.map(obj => obj[env] || {}));
  }
  private async parseIntellijVariables(dirname: PathLike): Promise<Array<Record<string, Variables >>> {
    if (!this.env) {

      const fileNames = ['http-client.env.json', 'http-client.private.env.json'];
      const environments: Array<Record<string, Variables>> = [];
      const validFilesNames: Array<PathLike> = [];
      for (const fileName of fileNames) {
        const envFileName = fileProvider.joinPath(dirname, fileName);
        try {
          const content = await fileProvider.readFile(envFileName, 'utf-8');
          const variables = JSON.parse(content);
          environments.push(variables);
          validFilesNames.push(envFileName);
        } catch (err) {
          log.trace(err);
        }
      }
      this.env = environments;
      this.watchEnvFiles(validFilesNames);
    }
    return this.env;
  }

  private watchEnvFiles(validFilesNames: PathLike[]) {
    if (validFilesNames.length > 0) {
      for (const file of validFilesNames) {
        const fileString = fileProvider.toString(file);
        if (!this.watchDisposes[fileString]) {
          this.watchDisposes[fileString] = fileProvider.watchFile(file, storeReset);
        }
      }
    }
  }
}
