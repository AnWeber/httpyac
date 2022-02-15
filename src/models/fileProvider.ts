import { PathLike } from './pathLike';

export type FileEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

export interface FileProvider {
  EOL: string;
  exists(fileName: PathLike): Promise<boolean>;
  joinPath(fileName: PathLike, path: string): PathLike;
  dirname(fileName: PathLike): PathLike | undefined;
  isAbsolute(fileName: PathLike): Promise<boolean>;
  readFile(fileName: PathLike, encoding: FileEncoding): Promise<string>;
  readBuffer(fileName: PathLike): Promise<Buffer>;
  writeBuffer(fileName: PathLike, buffer: Buffer): Promise<void>;
  readdir: (dirname: PathLike) => Promise<string[]>;
  hasExtension(fileName: PathLike, ...extensions: Array<string>): boolean;
  fsPath(fileName: PathLike): string | undefined;
  toString(fileName: PathLike): string;
}
