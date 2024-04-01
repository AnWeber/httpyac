import { fileProvider } from '../io';
import { PathLike } from '../models';
import { isString } from './stringUtils';

export async function toAbsoluteFilename(
  fileName: PathLike | undefined,
  baseName: PathLike | undefined
): Promise<PathLike | undefined> {
  if (fileName) {
    if ((await fileProvider.isAbsolute(fileName)) && (await fileProvider.exists(fileName))) {
      return fileName;
    }
    if (baseName && isString(fileName)) {
      const absolute = fileProvider.joinPath(baseName, fileName);
      if (await fileProvider.exists(absolute)) {
        return absolute;
      }
    }
  }
  return undefined;
}

export function extensionName(fileName: PathLike) {
  const file = fileProvider.toString(fileName);
  const dotIndex = file.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < file.length - 2) {
    return file.slice(dotIndex + 1);
  }
  return undefined;
}

export function replaceInvalidChars(fileName: string): string {
  const result = fileName.replace(/[/\\?%*:|"<>\s()@\-~,=$]/gu, '_');
  return result
    .split('_')
    .filter(obj => obj.length > 0)
    .join('_');
}

export function shortenFileName(fileName: string, maxChars = 50): string {
  const result: Array<string> = [];

  let charLength = 0;
  for (const item of fileName.split('_').reverse()) {
    if (item.length + charLength < maxChars) {
      result.push(item);
      charLength += item.length + 1;
    } else if (result.length === 0) {
      result.push(item);
    }
  }
  const joinedString = result.reverse().join('_');
  return joinedString.slice(Math.max(joinedString.length - maxChars, 0));
}

export async function findRootDirOfFile(
  filename: PathLike,
  workingDir?: PathLike,
  ...files: Array<string>
): Promise<PathLike | undefined> {
  let file = filename;
  const fsPath = fileProvider.fsPath(filename);
  if (!(await fileProvider.isAbsolute(filename)) && workingDir && fsPath) {
    file = fileProvider.joinPath(workingDir, fsPath);
  }
  const dirName = fileProvider.dirname(file);
  return await findRootDir(dirName, ...files);
}

export async function findRootDir(
  currentDir: PathLike | undefined,
  ...files: Array<string>
): Promise<PathLike | undefined> {
  return iterateDirectoryTree(currentDir, async (dir: PathLike) => {
    const dirFiles = await fileProvider.readdir(dir);

    if (dirFiles.some(file => files.indexOf(file) >= 0)) {
      return true;
    }
    for (const file of files) {
      if (dirFiles.some(obj => file.startsWith(obj))) {
        if (await fileProvider.exists(fileProvider.joinPath(dir, file))) {
          return true;
        }
      }
    }
    return false;
  });
}

export async function iterateUntilRoot(
  currentDir: PathLike,
  rootDir: PathLike | undefined,
  action: (dir: PathLike) => Promise<void>
) {
  return iterateDirectoryTree(currentDir, async dir => {
    await action(dir);
    return !!rootDir && equalsPath(rootDir, dir);
  });
}

export async function iterateDirectoryTree(
  currentDir: PathLike | undefined,
  predicate: (dir: PathLike) => Promise<boolean>
): Promise<PathLike | undefined> {
  if (currentDir) {
    if (await predicate(currentDir)) {
      return currentDir;
    }

    if (!equalsPath(fileProvider.dirname(currentDir), currentDir)) {
      return iterateDirectoryTree(fileProvider.dirname(currentDir), predicate);
    }
  }
  return undefined;
}

export function equalsPath(path: PathLike | undefined, path2: PathLike | undefined): boolean {
  return !!path && !!path2 && fileProvider.toString(path) === fileProvider.toString(path2);
}
