import { promises as fs, createReadStream } from 'fs';
import { join, isAbsolute, dirname, extname } from 'path';
import { FileEnconding, FileProvider, PathLike } from '../models';


function toString(fileName: PathLike): string {
  if (typeof fileName === 'string') {
    return fileName;
  }
  return fileName.toString();
}

export const fileProvider: FileProvider = {
  exists: async (fileName: PathLike): Promise<boolean> => {
    try {
      return !!(await fs.stat(toString(fileName)));
    } catch (err) {
      return false;
    }
  },
  extname: (fileName: string) => extname(fileName),
  dirname: (fileName: string) => dirname(toString(fileName)),
  isAbsolute: (fileName: PathLike) => isAbsolute(toString(fileName)),
  joinPath: (fileName: PathLike, path: string) => join(toString(fileName), path),
  readFile: (fileName: PathLike, encoding: FileEnconding) => fs.readFile(toString(fileName), encoding),
  readBuffer: (fileName: PathLike) => {
    const stream = createReadStream(toString(fileName));
    return toBuffer(stream);
  },
  readdir: (path: PathLike) => fs.readdir(toString(path)),
  fsPath: toString,
  toString
};


function toBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    stream.on('data', obj => {
      if (Buffer.isBuffer(obj)) {
        buffers.push(obj);
      } else {
        buffers.push(Buffer.from(obj));
      }
    });
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', error => reject(error));
    stream.resume();
  });
}
