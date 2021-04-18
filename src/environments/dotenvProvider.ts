import { Variables, EnvironmentProvider } from '../models';
import {promises as fs, watchFile, unwatchFile } from 'fs';
import { parse } from 'dotenv';
import { log } from '../logger';
import {environmentStore} from './environmentStore';
import { join } from 'path';

function storeReset() {
  environmentStore.reset();
}

export class DotenvProvider implements EnvironmentProvider {

  private watchFiles: Array<string> = [];

  constructor(private readonly basepath: string, private readonly defaultFiles: Array<string> = ['.env']) { }

  reset() : void{
    for (const watchFile of this.watchFiles) {
      unwatchFile(watchFile, storeReset);
    }
    this.watchFiles.length = 0;
  }

  async getEnvironments(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.basepath);

      return files
        .filter(file => file.startsWith('.env') || file.endsWith('.env'))
        .filter(fileName => this.defaultFiles.indexOf(fileName) < 0)
        .map(fileName => fileName.replace('.env', ''));

    } catch (err) {
      log.trace(err);
    }
    return [];
  }

  async getVariables(env: string): Promise<Variables> {
    const { variables, validFilesNames } = await this.parseDotenv(this.basepath, this.getDotenvFiles(this.defaultFiles, env));
    if (validFilesNames.length > 0) {
      for (const file of validFilesNames) {
        if (this.watchFiles.indexOf(file) < 0) {
          this.watchFiles.push(file);
          watchFile(file, storeReset);
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


  private async parseDotenv(dirname: string, fileNames: Array<string>): Promise<{ variables: Variables; validFilesNames: Array<string>; }> {
    const vars: Array<Variables> = [];
    const validFilesNames: Array<string> = [];
    for (const fileName of fileNames) {
      const envFileName = join(dirname, fileName);
      try {
        if ((await fs.stat(envFileName))) {
          const content = await fs.readFile(envFileName);
          const variables = parse(content);
          vars.push(variables);
          validFilesNames.push(envFileName);
        }
      } catch (err) {
        log.trace(err);
      }
    }
    const variables = Object.assign({}, ...vars);
    return { variables, validFilesNames };
  }
}