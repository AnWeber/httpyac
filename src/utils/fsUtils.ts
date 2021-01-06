import { isAbsolute, join, dirname } from 'path';
import { promises as fs } from 'fs';
import { log } from '../logger';


export async function normalizeFileName(fileName: string, httpFileName: string) {
  try {
    if (isAbsolute(fileName) && await fs.stat(fileName)) {
      return fileName;
    }
    const absolute = join(dirname(httpFileName), fileName);
    if (fs.stat(fileName)) {
      return absolute;
    }
  } catch (err) {
    log.debug(fileName, err);
  }
  return undefined;
}