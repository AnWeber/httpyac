import { Variables, EnvironmentProvider } from '../models';
import { join } from 'path';
import {promises as fs, watchFile, unwatchFile } from 'fs';
import { log } from '../logger';
import { environmentStore } from './environmentStore';

function storeReset() {
  environmentStore.reset();
}


export class IntellijProvider implements EnvironmentProvider {

  private watchFiles: Array<string> = [];

  private env: Array<Record<string, Variables>> |undefined;

  constructor(public readonly basepath: string) { }

  reset() {
    delete this.env;
    for (const watchFile of this.watchFiles) {
      unwatchFile(watchFile, storeReset);
    }
    this.watchFiles.length = 0;
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

  async getVariables(env: string): Promise<Record<string, any>> {
    const environments = await this.parseIntellijVariables(this.basepath);
    return Object.assign({}, ...environments.map(obj => obj[env] || {}));
  }
  private async parseIntellijVariables(dirname: string): Promise<Array<Record<string, Variables >>> {
    if (!this.env) {

      const fileNames = ['http-client.env.json', 'http-client.private.env.json'];
      const environments: Array<Record<string, Variables>> = [];
      const validFilesNames: Array<string> = [];
      for (const fileName of fileNames) {
        const envFileName = join(dirname, fileName);
        try {
          if ((await fs.stat(envFileName))) {
            const content = await fs.readFile(envFileName, 'utf-8');
            const variables = JSON.parse(content);
            environments.push(variables);
            validFilesNames.push(envFileName);
          }
        } catch (err) {
          log.trace(err);
        }
      }
      this.env = environments;
      this.watchEnvFiles(validFilesNames);
    }
    return this.env;
  }

  private watchEnvFiles(validFilesNames: string[]) {
    if (validFilesNames.length > 0) {
      for (const file of validFilesNames) {
        if (this.watchFiles.indexOf(file) < 0) {
          this.watchFiles.push(file);
          watchFile(file, storeReset);
        }
      }
    }
  }
}