import { fileProvider, log } from '../../io';
import { PathLike, VariableProviderContext, Variables } from '../../models';
import * as utils from '../../utils';
import { parse } from 'dotenv';

const defaultFiles: Array<string> = ['.env'];

export async function provideDotenvEnvironments(context: VariableProviderContext): Promise<string[]> {
  const files: Array<string> = [];

  files.push(...(await readEnvDir(process.env.HTTPYAC_ENV, context)));
  files.push(...(await readEnvDir(context.config?.envDirName, context)));

  const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
  if (dirOfFile) {
    await utils.iterateUntilRoot(dirOfFile, context.httpFile.rootDir, async (dir: PathLike) => {
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

async function readEnvDir(dir: string | undefined, context: VariableProviderContext): Promise<Array<string>> {
  const files = [];
  if (dir && utils.isString(dir)) {
    const absoluteDir = await utils.toAbsoluteFilename(dir, context.httpFile.rootDir);
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

  const globalEnv = process.env.HTTPYAC_ENV;
  if (globalEnv && utils.isString(globalEnv)) {
    const globalEnvAbsolute = await utils.toAbsoluteFilename(globalEnv, context.httpFile.rootDir);
    if (globalEnvAbsolute) {
      variables.push(...(await getEnvVariables(searchFiles, globalEnvAbsolute)));
    }
  }

  await getEnvFolderVariables(context.config?.envDirName, searchFiles, context.httpFile.rootDir);
  const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
  if (dirOfFile) {
    const vars: Array<Variables> = [];
    await utils.iterateUntilRoot(dirOfFile, context.httpFile.rootDir, async (dir: PathLike) => {
      vars.unshift(...(await getEnvFolderVariables(context.config?.envDirName, searchFiles, dir)));
      vars.unshift(...(await getEnvVariables(searchFiles, dir)));
    });
    variables.push(...vars);
  }
  return Object.assign({}, ...variables);
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

function getSearchFiles(env: string[] | undefined) {
  const searchFiles = [...defaultFiles];
  if (env) {
    for (const environment of env) {
      searchFiles.push(`${environment}.env`, `.env.${environment}`);
    }
  }
  return searchFiles;
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
