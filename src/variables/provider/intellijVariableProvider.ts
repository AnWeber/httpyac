import { fileProvider, log } from '../../io';
import { PathLike, VariableProviderContext, Variables } from '../../models';
import * as utils from '../../utils';

export async function provideIntellijEnvironments(context: VariableProviderContext): Promise<string[]> {
  return Object.keys(await getAllEnvironmentVariables(context));
}

async function getAllEnvironmentVariables(context: VariableProviderContext) {
  const envJsonFiles: Array<PathLike> = [];

  const envJsonFilter = (file: string) => file.endsWith('.env.json');

  const globalEnv = process.env.HTTPYAC_ENV;
  if (globalEnv && utils.isString(globalEnv)) {
    const globalEnvAbsolute = await utils.toAbsoluteFilename(globalEnv, context.httpFile.rootDir);
    if (globalEnvAbsolute) {
      envJsonFiles.push(...(await readAbsoulteDirs(globalEnvAbsolute, envJsonFilter)));
    }
  }
  if (context.httpFile.rootDir) {
    envJsonFiles.push(...(await readAbsoulteDirs(context.httpFile.rootDir, envJsonFilter)));
  }
  if (context.config?.envDirName) {
    const absolute = await utils.toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir);
    if (absolute) {
      envJsonFiles.push(...(await readAbsoulteDirs(absolute, envJsonFilter)));
    }
    const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
    if (dirOfFile) {
      envJsonFiles.push(...(await readAbsoulteDirs(dirOfFile, envJsonFilter)));
    }
  }
  const environments: Record<string, Variables> = {};
  for (const file of envJsonFiles) {
    const envs = await getEnvironmentVariables(file);
    if (envs) {
      for (const [key, value] of Object.entries(envs)) {
        if (environments[key]) {
          if (!fileProvider.toString(file).endsWith('private.env.json')) {
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

async function readAbsoulteDirs(dir: PathLike, filter: (file: string) => boolean) {
  const files = await fileProvider.readdir(dir);
  return files.filter(filter).map(file => fileProvider.joinPath(dir, file));
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
