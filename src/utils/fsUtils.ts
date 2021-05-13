import { log } from '../logger';
import { EnvironmentConfig } from '../models';
import { fileProvider, PathLike } from '../fileProvider';


export async function toAbsoluteFilename(fileName: string, baseName: PathLike, isFolder = false) : Promise<PathLike | undefined> {
  if (fileProvider.isAbsolute(fileName) && await fileProvider.exists(fileName)) {
    return fileName;
  }
  let dirName: PathLike = baseName;
  if (!isFolder) {
    dirName = fileProvider.dirname(baseName);
  }
  const absolute = fileProvider.joinPath(dirName, fileName);
  if (await fileProvider.exists(absolute)) {
    return absolute;
  }
  return undefined;
}

export function replaceInvalidChars(fileName: string): string {
  const result = fileName.replace(/[/\\?%*:|"<>]/gu, '_');
  return result.split('_').filter(obj => obj.length > 0).join('_');
}


export function shortenFileName(fileName: string, maxChars = 50): string {
  const result: Array<string> = [];

  let charLength = 0;
  for (const item of fileName.split('_').reverse()) {
    if (item.length + charLength < maxChars) {
      result.push(item);
      charLength += (item.length + 1);
    } else if (result.length === 0) {
      result.push(item);
    }
  }
  const joinedString = result.reverse().join('_');
  return joinedString.slice(Math.max(joinedString.length - maxChars, 0));
}


export async function findPackageJson(currentDir: PathLike, files: Array<string> = ['package.json', '.httpyac.json', 'env']): Promise<PathLike | undefined> {
  for (const file of files) {
    const dir = fileProvider.joinPath(currentDir, file);
    if (await fileProvider.exists(dir)) {
      return fileProvider.dirname(dir);
    }
  }
  if (fileProvider.dirname(currentDir) !== currentDir) {
    return findPackageJson(fileProvider.dirname(currentDir), files);
  }
  return undefined;
}

export async function parseJson<T>(fileName: PathLike) : Promise<T | undefined> {
  try {
    const text = await fileProvider.readFile(fileName, 'utf-8');
    return JSON.parse(text);
  } catch (err) {
    log.trace(err);
  }
  return undefined;
}


export async function getHttpacJsonConfig(rootDir: PathLike) : Promise<EnvironmentConfig | undefined> {
  let result = await parseJson<EnvironmentConfig>(fileProvider.joinPath(rootDir, '.httpyac.json'));
  if (!result) {
    result = (await parseJson<Record<string, EnvironmentConfig>>(fileProvider.joinPath(rootDir, 'package.json')))?.httpyac;
  }
  return result;
}
