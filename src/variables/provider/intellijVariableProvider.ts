import { fileProvider, log, PathLike } from '../../io';
import { VariableProviderContext, Variables } from '../../models';
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
    await getEnvironmentVariables(context.httpFile.rootDir);
  }
  if (context.config?.envDirName) {
    const absolute = await toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir, true);
    if (absolute) {
      environments.push(...await getEnvironmentVariables(absolute));
    }
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
      if (fileProvider.exists(fileName)) {
        const content = await fileProvider.readFile(fileName, 'utf-8');
        environments.push(JSON.parse(content));
      }
    } catch (err) {
      log.debug(`${file} in ${fileProvider.toString(workingDir)} not found`);
    }
  }
  return environments;
}
