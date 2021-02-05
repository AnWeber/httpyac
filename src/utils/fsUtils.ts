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