import { FileProvider, PathLike } from '../models';

export const fileProvider: FileProvider = {
  exists: () => {
    throw new Error('Not Implemented');
  },
  dirname: () => {
    throw new Error('Not Implemented');
  },
  isAbsolute: () => {
    throw new Error('Not Implemented');
  },
  joinPath: () => {
    throw new Error('Not Implemented');
  },
  readFile: () => {
    throw new Error('Not Implemented');
  },
  readBuffer: () => {
    throw new Error('Not Implemented');
  },
  writeBuffer: () => {
    throw new Error('Not Implemented');
  },
  readdir: () => {
    throw new Error('Not Implemented');
  },
  fsPath: toString,
  toString,
};

function toString(fileName: PathLike): string {
  if (typeof fileName === 'string') {
    return fileName;
  }
  return fileName.toString();
}
