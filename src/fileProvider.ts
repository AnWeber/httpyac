import { promises as fs, watchFile, unwatchFile, createReadStream } from 'fs';
import { join, isAbsolute, dirname, extname } from 'path';
export type FileEnconding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';

export type PathLike = string | { getPath(): string; };

export interface FileProvider{
  exists(fileName: PathLike): Promise<boolean>;
  joinPath(fileName: PathLike, path: string): PathLike;
  extname(fileName: PathLike): string;
  dirname(fileName: PathLike): PathLike;
  isAbsolute(fileName: PathLike): boolean;
  readFile(fileName: PathLike, encoding: FileEnconding): Promise<string>;
  readBuffer(fileName: PathLike): Promise<Buffer>;
  readdir: (dirname: PathLike) => Promise<string[]>;
  watchFile(fileName: PathLike, listener: () => void): WatchDispose,
  toString(fileName: PathLike): string;
}

export type WatchDispose = () => void;


function toString(fileName: PathLike): string {
  if (typeof fileName === 'string') {
    return fileName;
  }
  return fileName.getPath();
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
  watchFile: (fileName: PathLike, listener: () => void) => {
    watchFile(toString(fileName), listener);
    return () => unwatchFile(toString(fileName), listener);
  },
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
