import { fileProvider, log } from '../../io';
import { PathLike, VariableProviderContext, Variables } from '../../models';
import * as utils from '../../utils';

export async function provideIntellijEnvironments(context: VariableProviderContext): Promise<string[]> {
  return Object.keys(await getAllEnvironmentVariables(context));
}

async function getAllEnvironmentVariables(context: VariableProviderContext) {
  const files: Array<string> = [];

  const globalEnv = process.env.HTTPYAC_ENV;
  if (globalEnv && utils.isString(globalEnv)) {
    const globalEnvAbsolute = await utils.toAbsoluteFilename(globalEnv, context.httpFile.rootDir);
    if (globalEnvAbsolute) {
      files.push(...(await fileProvider.readdir(globalEnvAbsolute)));
    }
  }
  if (context.httpFile.rootDir) {
    files.push(...(await fileProvider.readdir(context.httpFile.rootDir)));
  }
  if (context.config?.envDirName) {
    const absolute = await utils.toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir);
    if (absolute) {
      files.push(...(await fileProvider.readdir(absolute)));
    }
    const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
    if (dirOfFile) {
      files.push(...(await fileProvider.readdir(dirOfFile)));
    }
  }
  const envJsonFiles = files.filter(file => file.endsWith('.env.json'));
  const environments: Record<string, Variables> = {};
  for (const file of envJsonFiles) {
    const envs = await getEnvironmentVariables(file);
    if (envs) {
      for (const [key, value] of Object.entries(envs)) {
        if (environments[key]) {
          if (!file.endsWith('private.env.json')) {
            log.warn(`Multiple files with environment ${key} were found.`);
          }
          Object.assign(environments[key], value);
        } else {
          environments[key] = value;
        }
      }
    }
  }
  return environments;
}

export async function provideIntellijVariables(
  envs: string[] | undefined,
  context: VariableProviderContext
): Promise<Variables> {
  const environments = await getAllEnvironmentVariables(context);
  const variables: Array<Variables> = [];
  if (envs) {
    for (const env of envs) {
      variables.push(environments[env]);
    }
  }
  return Object.assign({}, ...variables);
}

async function getEnvironmentVariables(fileName: PathLike): Promise<Record<string, Variables> | undefined> {
  try {
    if (await fileProvider.exists(fileName)) {
      const content = await fileProvider.readFile(fileName, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    log.trace(`${fileName} not found`);
    log.trace(err);
  }
  return undefined;
}
