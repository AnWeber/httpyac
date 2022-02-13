import { fileProvider, log } from '../../../io';
import { PathLike, VariableProviderContext, Variables } from '../../../models';
import * as utils from '../../../utils';
import { parse } from 'dotenv';

const defaultFiles: Array<string> = ['.env'];

export async function provideDotenvEnvironments(context: VariableProviderContext): Promise<string[]> {
  const files: Array<string> = [];

  const globalEnv = process.env.HTTPYAC_ENV;
  if (globalEnv && utils.isString(globalEnv)) {
    const globalEnvAbsolute = await utils.toAbsoluteFilename(globalEnv, context.httpFile.rootDir);
    if (globalEnvAbsolute) {
      files.push(...(await fileProvider.readdir(globalEnvAbsolute)));
    }
  }
  if (context.config?.envDirName) {
    const absolute = await utils.toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir);
    if (absolute) {
      files.push(...(await fileProvider.readdir(absolute)));
    }
  }

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
      variables.push(...(await getVariablesOfFolder(searchFiles, globalEnvAbsolute)));
    }
  }

  if (context.config?.envDirName) {
    const absolute = await utils.toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir);
    if (absolute) {
      variables.push(...(await getVariablesOfFolder(searchFiles, absolute)));
    }
  }
  const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
  if (dirOfFile) {
    const vars: Array<Variables> = [];
    await utils.iterateUntilRoot(dirOfFile, context.httpFile.rootDir, async (dir: PathLike) => {
      vars.unshift(...(await getVariablesOfFolder(searchFiles, dir)));
    });
    variables.push(...vars);
  }
  return Object.assign({}, ...variables);
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

async function getVariablesOfFolder(searchFiles: string[], workingDir: PathLike) {
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
      log.trace(`${fileProvider.toString(workingDir)}/${fileName} not found`);
    }
  }
  return vars;
}
