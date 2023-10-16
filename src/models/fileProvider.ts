import { PathLike } from './pathLike';

export type FileEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

export interface FileProvider {
  EOL: string;
  exists(path: PathLike): Promise<boolean>;
  joinPath(path: PathLike, joinPath: string): PathLike;
  dirname(path: PathLike): PathLike | undefined;
  isAbsolute(path: PathLike): Promise<boolean>;
  readFile(fileName: PathLike, encoding: FileEncoding): Promise<string>;
  readBuffer(fileName: PathLike): Promise<Buffer>;
  writeBuffer(fileName: PathLike, buffer: Buffer): Promise<void>;
  readdir: (dirname: PathLike) => Promise<string[]>;
  hasExtension(fileName: PathLike, ...extensions: Array<string>): boolean;
  fsPath(path: PathLike): string | undefined;
  toString(path: PathLike): string;
}
