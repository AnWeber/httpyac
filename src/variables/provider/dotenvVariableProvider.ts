import { fileProvider, log, PathLike } from '../../io';
import { VariableProviderContext, Variables } from '../../models';
import { parse } from 'dotenv';
import { expandVariables, toAbsoluteFilename } from '../../utils';

const defaultFiles: Array<string> = ['.env'];

export async function provideDotenvEnvironments(context: VariableProviderContext): Promise<string[]> {

  const files: Array<string> = [];

  if (context.httpFile.rootDir) {
    files.push(...await fileProvider.readdir(context.httpFile.rootDir));
  }
  if (context.config?.envDirName) {
    const absolute = await toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir, true);
    if (absolute) {
      files.push(...await fileProvider.readdir(absolute));
    }
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

export async function provideDotenvVariables(env: string[] | undefined, context: VariableProviderContext): Promise<Variables> {
  const searchFiles = getSearchFiles(env);
  const variables: Array<Variables> = [];

  if (context.httpFile.rootDir) {
    variables.push(...await getVariablesOfFolder(searchFiles, context.httpFile.rootDir));
  }
  if (context.config?.envDirName) {
    const absolute = await toAbsoluteFilename(context.config.envDirName, context.httpFile.rootDir, true);
    if (absolute) {
      variables.push(...await getVariablesOfFolder(searchFiles, absolute));
    }
  }
  const result = Object.assign({}, ...variables);
  return expandVariables(result);
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
      log.debug(`${fileName} in ${fileProvider.toString(workingDir)} not found`);
    }
  }
  return vars;
}
