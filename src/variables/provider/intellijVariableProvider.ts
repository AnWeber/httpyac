import { fileProvider, log } from '../../io';
import { PathLike, VariableProviderContext, Variables } from '../../models';
import { expandVariables, toAbsoluteFilename } from '../../utils';

const defaultFiles: Array<string> = ['http-client.env.json', 'http-client.private.env.json'];

export async function provideIntellijEnvironments(context: VariableProviderContext): Promise<string[]> {
  const environments = await getAllEnvironmentVariables(context);
  return environments
    .reduce((prev, current) => {
      for (const [env] of Object.entries(current)) {
        prev.push(env);
      }
      return prev;
    }, [] as Array<string>);
}

async function getAllEnvironmentVariables(context: VariableProviderContext) {
  const environments: Array<Record<string, Variables>> = [];

  if (context.httpFile.rootDir) {
    environments.push(...await getEnvironmentVariables(context.httpFile.rootDir));
  }
  if (context.config?.envDirName) {
    const absolute = await toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir);
    if (absolute) {
      environments.push(...await getEnvironmentVariables(absolute));
    }
  }
  const dirOfFile = fileProvider.dirname(context.httpFile.fileName);
  if (dirOfFile) {
    environments.push(...await getEnvironmentVariables(dirOfFile));
  }
  return environments;
}

export async function provideIntellijVariables(envs: string[] | undefined, context: VariableProviderContext): Promise<Variables> {
  const environments = await getAllEnvironmentVariables(context);
  const variables: Array<Variables> = [];
  if (envs) {
    for (const env of envs) {
      variables.push(...environments
        .filter(obj => !!obj[env])
        .map(obj => obj[env]));
    }
  }
  return expandVariables(Object.assign({}, ...variables));
}

async function getEnvironmentVariables(workingDir: PathLike) {
  const environments: Array<Record<string, Variables>> = [];
  for (const file of defaultFiles) {
    try {
      const fileName = fileProvider.joinPath(workingDir, file);
      if (await fileProvider.exists(fileName)) {
        const content = await fileProvider.readFile(fileName, 'utf-8');
        environments.push(JSON.parse(content));
      }
    } catch (err) {
      log.trace(`${fileProvider.toString(workingDir)}/${file} not found`);
    }
  }
  return environments;
}
