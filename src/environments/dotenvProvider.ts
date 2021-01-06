import { HttpFile } from '../httpRegion';
import { EnvironmentProvider } from './environmentProvider';
import { dirname,join } from 'path';
import {promises as fs } from 'fs';
import { parse } from 'dotenv';
import { log } from '../logger';

export class DotenvProvider implements EnvironmentProvider{

  constructor(private readonly basepath: string, private readonly defaultFiles: Array<string> = ['.env']) { }

  async getEnvironments(): Promise<string[]> {
    const files = await fs.readdir(this.basepath);

    return files
      .filter(file => file.indexOf('.env') >= 0)
      .filter(fileName => this.defaultFiles.indexOf(fileName) < 0)
      .map(fileName => fileName.replace('.env', ''));
  }
  async getVariables(env: string): Promise<Record<string, any>> {
    return await parseDotenv(this.basepath, getFiles(this.defaultFiles, env) );
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
  return async function (httpFile: HttpFile) {
    if (httpFile.fileName) {
      return await parseDotenv(dirname(httpFile.fileName), getFiles(defaultFiles, httpFile.env));
    }
    return undefined;
  };
}

async function parseDotenv(dirname: string, fileNames: Array<string>): Promise<Record<string, any>> {
  const vars = [];
  for (const fileName of fileNames) {
    const envFileName = join(dirname, fileName);
    try {
      if ((await fs.stat(envFileName))) {
        const content = await fs.readFile(envFileName);
        const variables = parse(content);
        vars.push(variables);
      }
    } catch (err) {
      log.trace(err);
    }
  }
  return Object.assign({}, ...vars);
}