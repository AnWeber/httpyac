import { isAbsolute, join, dirname } from 'path';
import { promises as fs } from 'fs';
import { log } from '../logger';


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
    if (fs.stat(fileName)) {
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