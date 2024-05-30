import { fileProvider, log } from '../../io';
import { PathLike, VariableProviderContext, Variables } from '../../models';
import * as utils from '../../utils';

export async function provideIntellijEnvironments(context: VariableProviderContext): Promise<string[]> {
  const envs = Object.keys(await getAllEnvironmentVariables(context));

  log.info('Intellij Env Provider found environments', envs);
  return envs;
}

async function getAllEnvironmentVariables(context: VariableProviderContext) {
  const envJsonFiles: Array<PathLike> = [];

  const envJsonFilter = (file: string) => ['http-client.env.json', 'http-client.private.env.json'].includes(file);

  const globalEnv = process.env.HTTPYAC_ENV;
  if (globalEnv && utils.isString(globalEnv)) {
    const globalEnvAbsolute = await utils.toAbsoluteFilename(globalEnv, context.httpFile.rootDir);
    if (globalEnvAbsolute) {
      envJsonFiles.push(...(await readAbsoluteDirs(globalEnvAbsolute, envJsonFilter)));
    }
  }
  if (context.config?.envDirName) {
    const absolute = await utils.toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir);
    if (absolute) {
      envJsonFiles.push(...(await readAbsoluteDirs(absolute, envJsonFilter)));
    }
  }
  const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
  if (dirOfFile) {
    await utils.iterateUntilRoot(dirOfFile, context.httpFile.rootDir, async (dir: PathLike) => {
      envJsonFiles.push(...(await readAbsoluteDirs(dir, envJsonFilter)));
    });
  }
  const environments: Record<string, Variables> = {};
  if (envJsonFiles.length > 0) {
    log.trace(`Intellij environment files found: ${envJsonFiles.join(', ')}`);
  }
  envJsonFiles.sort((path1, path2) => {
    const path1String = fileProvider.toString(path1);
    const path2String = fileProvider.toString(path2);
    const path1Private = path1String.endsWith('private.env.json');
    const path2Private = path2String.endsWith('private.env.json');
    if (path1Private === path2Private) {
      return path1String.localeCompare(path2String);
    }
    if (path1Private) {
      return 1;
    }
    return -1;
  });
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

async function readAbsoluteDirs(dir: PathLike, filter: (file: string) => boolean) {
  const files = await utils.useDefaultOnError(fileProvider.readdir(dir), []);
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
