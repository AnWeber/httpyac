import { HttpFile, Variables, EnvironmentProvider } from '../models';
import { dirname,join } from 'path';
import {promises as fs, watchFile } from 'fs';
import { parse } from 'dotenv';
import { log } from '../logger';
import {environmentStore} from './environmentStore';

export class DotenvProvider implements EnvironmentProvider{

  private watchFiles: Array<string> = [];

  constructor(private readonly basepath: string, private readonly defaultFiles: Array<string> = ['.env']) { }

  async getEnvironments(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.basepath);

      return files
        .filter(file => file.indexOf('.env') >= 0)
        .filter(fileName => this.defaultFiles.indexOf(fileName) < 0)
        .map(fileName => fileName.replace('.env', ''));

      } catch (err) {
        log.trace(err);
    }
    return [];
  }



  async getVariables(env: string): Promise<Record<string, any>> {
    const { variables, validFilesNames } = await parseDotenv(this.basepath, getFiles(this.defaultFiles, env));
    if (validFilesNames.length > 0) {
      for (const file of validFilesNames) {
        if (this.watchFiles.indexOf(file) < 0) {
          this.watchFiles.push(file);
          watchFile(file, environmentStore.refresh.bind(environmentStore));
        }
      }
    }
    return variables;
  }
}

function getFiles(defaultFiles: Array<string>, env: string | undefined) {
  const files = [...defaultFiles];
  if (env) {
    files.push(`${env}.env`, `.env.${env}`);
  }
  return files;
}

export function dotenvVariableProviderFactory(defaultFiles: Array<string> = ['.env']) {
  return async function (env: string[] | undefined, httpFile: HttpFile): Promise<Record<string, any>> {

    if (httpFile.fileName) {
      const files: Array<string> = [];
      if (env) {
        files.push(...env.map(env => getFiles(defaultFiles, env))
          .reduce((prev, current) => {
            for (const item of current) {
              if (prev.indexOf(item) < 0) {
                prev.push(item);
              }
            }
            return prev;
          }, []));
      } else {
        files.push(...getFiles(defaultFiles, env));
      }
      const { variables } = await parseDotenv(dirname(httpFile.fileName), files);
      return variables;
    }
    return {};
  };
}

async function parseDotenv(dirname: string, fileNames: Array<string>): Promise<{ variables: Variables; validFilesNames: Array<string>; }> {
  const vars: Array<Record<string, any>> = [];
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