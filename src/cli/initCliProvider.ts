import { fileProvider, userInteractionProvider } from '../io';
import * as models from '../models';
import clipboard from 'clipboardy';
import { promises as fs, createReadStream } from 'fs';
import inquirer from 'inquirer';
import { join, isAbsolute, dirname } from 'path';

export function initIOProvider(): void {
  initFileProvider();
  initUserInteractionProvider();
}

function initFileProvider(): void {
  fileProvider.isAbsolute = async (fileName: models.PathLike) => isAbsolute(fileProvider.toString(fileName));
  fileProvider.dirname = (fileName: string) => dirname(fileProvider.toString(fileName));
  fileProvider.joinPath = (fileName: models.PathLike, path: string): models.PathLike =>
    join(fileProvider.toString(fileName), path);

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
  fileProvider.writeBuffer = (fileName: models.PathLike, buffer: Buffer) =>
    fs.writeFile(fileProvider.toString(fileName), buffer);
  fileProvider.readdir = async (dirname: models.PathLike): Promise<string[]> =>
    fs.readdir(fileProvider.toString(dirname));
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

function initUserInteractionProvider() {
  userInteractionProvider.showNote = async function showNote(note: string) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'note',
        message: note,
      },
    ]);
    return answer.note;
  };
  userInteractionProvider.showInputPrompt = async function showInputPrompt(message: string, defaultValue?: string) {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'placeholder',
        message,
        default: defaultValue,
      },
    ]);
    return answer.placeholder;
  };
  userInteractionProvider.showListPrompt = async function showListPrompt(message: string, values: string[]) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'placeholder',
        message,
        choices: values,
      },
    ]);
    return answer.placeholder;
  };
  userInteractionProvider.getClipboard = async function getClipboard() {
    return await clipboard.read();
  };
  userInteractionProvider.setClipboard = async function setClipboard(message: string) {
    await clipboard.write(message);
  };
}
