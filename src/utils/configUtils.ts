import { PathLike, fileProvider, log } from '../io';
import { EnvironmentConfig } from '../models';
import { toAbsoluteFilename } from './fsUtils';
import { loadModule } from './moduleUtils';

export async function getHttpacConfig(rootDir: PathLike) : Promise<EnvironmentConfig | undefined> {
  let result = await loadFileConfig(rootDir);
  if (!result) {
    result = (await parseJson<Record<string, EnvironmentConfig>>(fileProvider.joinPath(rootDir, 'package.json')))?.httpyac;
  }
  if (result) {
    await resolveClientCertficates(result, rootDir);
  }
  return result;
}

async function loadFileConfig(rootDir: PathLike): Promise<EnvironmentConfig | undefined> {
  const possibleConfigPaths: Array<string | undefined> = [
    process.env.HTTPYAC_SERVICE_CONFIG_PATH,
    './.httpyac.js',
    './httpyac.config.js',
    './.httpyac.json',
    './httpyac.config.json',
  ];
  let fileConfigPath: PathLike | undefined;
  for (const fileName of possibleConfigPaths) {
    const resolvedPath = fileName && fileProvider.joinPath(rootDir, fileName);
    if (resolvedPath && await fileProvider.exists(resolvedPath)) {
      fileConfigPath = resolvedPath;
      break;
    }
  }
  if (fileConfigPath) {
    const fileConfig = loadModule<EnvironmentConfig>(fileProvider.fsPath(fileConfigPath), fileProvider.fsPath(rootDir), true);
    if (typeof fileConfig === 'function') {
      return fileConfig();
    }
    return fileConfig;

  }
  return undefined;
}


export async function parseJson<T>(fileName: PathLike) : Promise<T | undefined> {
  try {
    const text = await fileProvider.readFile(fileName, 'utf-8');
    return JSON.parse(text);
  } catch (err) {
    log.trace(err);
  }
  return undefined;
}


export async function resolveClientCertficates(config: EnvironmentConfig, rootDir: PathLike) : Promise<void> {
  if (config.clientCertificates) {
    for (const [, value] of Object.entries(config.clientCertificates)) {
      if (value.cert) {
        value.cert = await toAbsoluteFilename(value.cert, rootDir, true) || value.cert;
      }
      if (value.key) {
        value.key = await toAbsoluteFilename(value.key, rootDir, true) || value.key;
      }
      if (value.pfx) {
        value.pfx = await toAbsoluteFilename(value.pfx, rootDir, true) || value.pfx;
      }
    }
  }
}
