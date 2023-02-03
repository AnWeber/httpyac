import { send } from '../httpYacApi';
import * as io from '../io';
import * as models from '../models';
import '../registerPlugins';
import * as store from '../store';
import { promises as fs } from 'fs';
import { EOL } from 'os';
import { isAbsolute, dirname, extname, join } from 'path';

export async function parseHttp(code: string) {
  return await new store.HttpFileStore().getOrCreate(`any.http`, async () => Promise.resolve(code), 0, {
    workingDir: __dirname,
  });
}

export async function sendHttp(code: string) {
  const httpFile = await parseHttp(code);

  const result: Array<models.HttpResponse> = [];
  httpFile.hooks.onResponse.addHook('testResponse', response => {
    result.push(response);
  });

  await send({
    httpFile,
  });
  return result;
}

export function initFileProvider(files?: Record<string, string> | undefined) {
  const fileProvider = io.fileProvider;
  fileProvider.EOL = EOL;

  fileProvider.isAbsolute = async fileName => isAbsolute(fileProvider.toString(fileName));
  fileProvider.dirname = fileName => dirname(fileProvider.toString(fileName));
  fileProvider.hasExtension = (fileName, ...extensions) =>
    extensions.indexOf(extname(fileProvider.toString(fileName))) >= 0;
  fileProvider.joinPath = (fileName, path) => join(fileProvider.toString(fileName), path);
  fileProvider.exists = async fileName => Promise.resolve(typeof fileName === 'string' && !!files && !!files[fileName]);
  fileProvider.readFile = filename => {
    if (typeof filename === 'string' && files && files[filename]) {
      return Promise.resolve(files[filename]);
    }
    throw new Error('No File');
  };
  fileProvider.readBuffer = filename => {
    if (typeof filename === 'string' && files && files[filename]) {
      return Promise.resolve(Buffer.from(files[filename]));
    }
    throw new Error('No File');
  };
  fileProvider.readdir = async dirname => fs.readdir(fileProvider.toString(dirname));
}
