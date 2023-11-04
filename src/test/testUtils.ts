import '../registerPlugins';

import { EOL } from 'os';
import { dirname, extname, isAbsolute, join } from 'path';

import { send } from '../httpYacApi';
import * as io from '../io';
import * as models from '../models';
import * as store from '../store';
import { TestRequestClient } from './testRequestClient';

export async function parseHttp(code: string, filename = 'any.http') {
  return await new store.HttpFileStore().getOrCreate(filename, async () => Promise.resolve(code), 0, {
    workingDir: '/',
  });
}

export async function sendHttp(code: string, variables: models.Variables = {}) {
  const httpFile = await parseHttp(code);

  const result: Array<models.HttpResponse> = [];
  httpFile.hooks.onResponse.addHook('testResponse', response => {
    result.push(response);
  });

  await send({
    httpFile,
    variables,
  });
  return result;
}

export async function sendHttpFile<T extends models.HttpFileSendContext>(context: T) {
  const result: Array<models.HttpResponse> = [];
  context.httpFile.hooks.onResponse.addHook('testResponse', response => {
    result.push(response);
  });

  await send({
    ...context,
  });
  return result;
}

export function initFileProvider(files?: Record<string, string> | undefined) {
  const fileProvider = io.fileProvider;
  fileProvider.EOL = EOL;

  fileProvider.isAbsolute = async fileName => typeof fileName === 'string' && fileName.startsWith('/');
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
  fileProvider.readdir = async () => {
    if (files) {
      return Object.keys(files);
    }
    return [];
  };
}

export type Directory = {
  childs: Record<string, Directory | string>;
};

export function initNestedFileProvider(filesystem: Directory) {
  const fileProvider = io.fileProvider;
  fileProvider.EOL = EOL;

  fileProvider.isAbsolute = async fileName => isAbsolute(fileProvider.toString(fileName));
  fileProvider.dirname = fileName => dirname(fileProvider.toString(fileName));
  fileProvider.hasExtension = (fileName, ...extensions) =>
    extensions.indexOf(extname(fileProvider.toString(fileName))) >= 0;
  fileProvider.joinPath = (fileName, path) => join(fileProvider.toString(fileName), path);

  function getPathContent(file: string): Directory | string | undefined {
    const paths = file.split('/').slice(1).reverse();
    let path: string | undefined;
    let currentObj: Directory | string | undefined = filesystem;
    while ((path = paths.pop()) && currentObj) {
      if (isDirectory(currentObj)) {
        currentObj = currentObj.childs[path];
      } else {
        return undefined;
      }
    }
    return currentObj;
  }

  fileProvider.exists = async fileName => Promise.resolve(typeof fileName === 'string' && !!getPathContent(fileName));
  fileProvider.readFile = async filename => {
    if (typeof filename === 'string') {
      const content = getPathContent(filename);
      if (typeof content === 'string') {
        return content;
      }
    }
    throw new Error('No File');
  };
  fileProvider.readBuffer = async filename => {
    if (typeof filename === 'string') {
      const content = getPathContent(filename);
      if (typeof content === 'string') {
        return Buffer.from(content);
      }
    }
    throw new Error('No File');
  };
  fileProvider.readdir = async dirname => {
    if (typeof dirname === 'string') {
      const content = getPathContent(dirname);
      if (isDirectory(content)) {
        return Object.keys(content.childs);
      }
    }
    return [];
  };
}

export function initHttpClientProvider(action?: (request: models.Request) => Promise<Partial<models.HttpResponse>>) {
  const requests: Array<models.Request> = [];
  io.httpClientProvider.createRequestClient = request => {
    requests.push(request);
    return new TestRequestClient(request, action);
  };
  return requests;
}

function isDirectory(file: Directory | string | undefined): file is Directory {
  return file !== undefined && typeof file !== 'string';
}
