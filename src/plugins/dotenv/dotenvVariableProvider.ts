import { parse } from 'dotenv';

import { fileProvider, log } from '../../io';
import { PathLike, VariableProviderContext, Variables } from '../../models';
import * as utils from '../../utils';

const defaultFiles: Array<string> = ['.env'];

export async function provideDotenvEnvironments(context: VariableProviderContext): Promise<string[]> {
  const files: Array<string> = [];

  if (process.env.HTTPYAC_ENV) {
    try {
      files.push(...(await fileProvider.readdir(process.env.HTTPYAC_ENV)));
    } catch (err) {
      log.warn(`HTTPYAC_ENV ${process.env.HTTPYAC_ENV} has read error`, err);
    }
  }

  const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
  if (dirOfFile) {
    await utils.iterateUntilRoot(dirOfFile, context.httpFile.rootDir, async (dir: PathLike) => {
      files.push(...(await readEnvDir(getEnvdirname(context) || 'env', dir)));
      files.push(...(await fileProvider.readdir(dir)));
    });
  }

  return files
    .filter(file => file.startsWith('.env') || file.endsWith('.env'))
    .filter(fileName => defaultFiles.indexOf(fileName) < 0)
    .map(fileName => {
      if (fileName.startsWith('.env')) {
        return fileName.slice(5);
      }
      return fileName.slice(0, fileName.length - 4);
    });
}

async function readEnvDir(dir: string | undefined, rootDir: PathLike | undefined): Promise<Array<string>> {
  const files = [];
  if (dir && utils.isString(dir)) {
    const absoluteDir = await utils.toAbsoluteFilename(dir, rootDir);
    if (absoluteDir) {
      files.push(...(await fileProvider.readdir(absoluteDir)));
    }
  }
  return files;
}

export async function provideDotenvVariables(
  env: string[] | undefined,
  context: VariableProviderContext
): Promise<Variables> {
  const searchFiles = getSearchFiles(env);
  const variables: Array<Variables> = [];

  if (process.env.HTTPYAC_ENV) {
    variables.push(...(await getEnvVariables(searchFiles, process.env.HTTPYAC_ENV)));
  }
  const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
  if (dirOfFile) {
    const vars: Array<Variables> = [];
    await utils.iterateUntilRoot(dirOfFile, context.httpFile.rootDir, async (dir: PathLike) => {
      vars.unshift(...(await getEnvFolderVariables(getEnvdirname(context), searchFiles, dir)));
      vars.unshift(...(await getEnvVariables(searchFiles, dir)));
    });
    variables.push(...vars);
  }
  return Object.assign({}, ...variables);
}

function getEnvdirname(context: VariableProviderContext) {
  return context.config?.envDirName || 'env';
}

function getSearchFiles(env: string[] | undefined) {
  const searchFiles = [...defaultFiles];
  if (env) {
    for (const environment of env) {
      searchFiles.push(`${environment}.env`, `.env.${environment}`);
    }
  }
  return searchFiles;
}

async function getEnvFolderVariables(
  envDirName: string | undefined,
  searchFiles: string[],
  dir: PathLike | undefined
): Promise<Array<Variables>> {
  const variables: Array<Variables> = [];
  if (envDirName) {
    const absolute = await utils.toAbsoluteFilename(envDirName, dir);
    if (absolute) {
      variables.push(...(await getEnvVariables(searchFiles, absolute)));
    }
  }
  return variables;
}

async function getEnvVariables(searchFiles: string[], dir: PathLike) {
  const files = await fileProvider.readdir(dir);
  const foundFiles = searchFiles.filter(file => files.indexOf(file) >= 0);
  const vars = [];

  for (const fileName of foundFiles) {
    const envFileName = fileProvider.joinPath(dir, fileName);
    log.trace(`.env environment file found: ${envFileName}`);
    try {
      const content = await fileProvider.readFile(envFileName, 'utf-8');
      const variables = parse(content);
      vars.push(variables);
    } catch (err) {
      log.trace(`${fileProvider.toString(dir)}/${fileName} not found`);
    }
  }
  return vars;
}
