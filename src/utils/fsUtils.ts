import { isAbsolute, join, dirname } from 'path';
import { promises as fs } from 'fs';
import { log } from '../logger';
import { EnvironmentConfig } from '../models';



export async function toAbsoluteFilename(fileName: string, baseName: string, isFolder: boolean = false) {
  try {
    if (isAbsolute(fileName) && await fs.stat(fileName)) {
      return fileName;
    }
    let dirName = baseName;
    if (!isFolder) {
      dirName = dirname(baseName);
    }
    const absolute = join(dirName, fileName);
    if (await fs.stat(absolute)) {
      return absolute;
    }
  } catch (err) {
    log.trace(fileName, err);
  }
  return undefined;
}

export function replaceInvalidChars(fileName: string) {
  fileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');

  return fileName.split('_').filter(obj => obj.length > 0).join('_');
}


export function shortenFileName(fileName: string, maxChars = 50) {
  const result: Array<string> = [];

  let charLength: number = 0;
  for (const item of fileName.split('_').reverse()) {
    if (item.length + charLength < maxChars) {
      result.push(item);
      charLength += (item.length + 1);
    } else if(result.length === 0) {
      result.push(item);
    }
  }
  const joinedString = result.reverse().join('_');
  return joinedString.substring(Math.max(joinedString.length - maxChars, 0));
}



export async function findPackageJson(currentDir: string, files: Array<string> = ['package.json', '.httpyac.json','env']): Promise<string | undefined> {
  for (const file of files) {
    try {
      const dir = join(currentDir, file);
      if (await fs.stat(dir)) {
        return dirname(dir);
      }
    } catch (err) {
      log.trace(err);
    }
  }
  if (dirname(currentDir) !== currentDir) {
    return findPackageJson(dirname(currentDir), files);
  }
  return undefined;
}

export async function parseJson(fileName: string) {
  try {
    const text = await fs.readFile(fileName, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    log.trace(err);
  }
  return undefined;
}


export async function getHttpacJsonConfig(rootDir: string) : Promise<EnvironmentConfig | undefined>{
  let result = await parseJson(join(rootDir, '.httpyac.json'));
  if (!result) {
    result = (await parseJson(join(rootDir, 'package.json')))?.httpyac;
  }
  return result;
}