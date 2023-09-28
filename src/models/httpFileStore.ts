import { EnvironmentConfig } from './environmentConfig';
import { HttpFile } from './httpFile';
import { PathLike } from './pathLike';

export interface ParseOptions {
  httpFileStore: HttpFileStore;
  config?: EnvironmentConfig;
  workingDir?: PathLike;
}

export type HttpFileStoreOptions = Omit<ParseOptions, 'httpFileStore'>;

export interface HttpFileStore {
  get(fileName: PathLike): HttpFile | undefined;

  getAll(): Array<HttpFile>;

  getOrCreate(
    fileName: PathLike,
    getText: () => Promise<string>,
    version: number,
    options: HttpFileStoreOptions
  ): Promise<HttpFile>;

  parse(fileName: PathLike, text: string, options: HttpFileStoreOptions): Promise<HttpFile>;

  remove(fileName: PathLike): boolean;

  rename(oldFileName: PathLike, newFileName: PathLike): void;

  clear(): void;
}
