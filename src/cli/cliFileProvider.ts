import * as models from '../models';
import { fileProvider } from '../io';
import { promises as fs, createReadStream } from 'fs';
import { join, isAbsolute, dirname } from 'path';


export function initFileProvider(): void {
  fileProvider.isAbsolute = async (fileName: models.PathLike) => isAbsolute(fileProvider.toString(fileName));
  fileProvider.dirname = (fileName: string) => dirname(fileProvider.toString(fileName));
  fileProvider.joinPath = (fileName: models.PathLike, path: string): models.PathLike => join(fileProvider.toString(fileName), path);

  fileProvider.exists = async (fileName: models.PathLike): Promise<boolean> => {
    try {
      return !!(await fs.stat(fileProvider.toString(fileName)));
    } catch (err) {
      return false;
    }
  };
  fileProvider.readFile = async (fileName: models.PathLike, encoding: models.FileEnconding): Promise<string> => {
    const file = fileProvider.fsPath(fileName);
    return fs.readFile(file, encoding);
  };
  fileProvider.readBuffer = async (fileName: models.PathLike) => {
    const file = fileProvider.fsPath(fileName);
    const stream = createReadStream(file);
    return toBuffer(stream);
  };
  fileProvider.writeBuffer = (fileName: models.PathLike, buffer: Buffer) => fs.writeFile(fileProvider.toString(fileName), buffer);
  fileProvider.readdir = async (dirname: models.PathLike): Promise<string[]> => fs.readdir(fileProvider.toString(dirname));
}


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
