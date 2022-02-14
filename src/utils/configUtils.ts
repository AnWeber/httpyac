import * as io from '../io';
import { ConfigureHooks, EnvironmentConfig, PathLike } from '../models';
import { toAbsoluteFilename, findRootDir } from './fsUtils';

export async function getHttpyacConfig(rootDir: PathLike): Promise<EnvironmentConfig | undefined> {
  let result = await loadFileConfig(rootDir);
  if (!result) {
    result = (await parseJson<Record<string, EnvironmentConfig>>(io.fileProvider.joinPath(rootDir, 'package.json')))
      ?.httpyac;
  }
  if (result) {
    await resolveClientCertificates(result, rootDir);
  }
  return result;
}

export const defaultConfigFiles = [
  '.httpyac.js',
  '.httpyac.config.js',
  'httpyac.config.js',
  '.httpyac.json',
  'httpyac.config.json',
];

async function loadFileConfig(rootDir: PathLike): Promise<EnvironmentConfig | undefined> {
  let fileConfigPath: string | undefined;
  for (const fileName of defaultConfigFiles) {
    const resolvedPath = fileName && io.fileProvider.joinPath(rootDir, fileName);
    if (resolvedPath && (await io.fileProvider.exists(resolvedPath))) {
      fileConfigPath = io.fileProvider.fsPath(resolvedPath);
      break;
    }
  }
  if (fileConfigPath) {
    const fsRoot = io.fileProvider.fsPath(rootDir);
    if (fsRoot && io.javascriptProvider.loadModule) {
      const fileConfig = io.javascriptProvider.loadModule<EnvironmentConfig | (() => EnvironmentConfig)>(
        fileConfigPath,
        fsRoot,
        true
      );
      if (typeof fileConfig === 'function') {
        return fileConfig();
      }
      return fileConfig;
    }
  }
  return undefined;
}

export async function parseJson<T>(fileName: PathLike): Promise<T | undefined> {
  try {
    const text = await io.fileProvider.readFile(fileName, 'utf-8');
    return JSON.parse(text);
  } catch (err) {
    io.log.debug(`json parse of ${fileName} failed`);
  }
  return undefined;
}

export async function resolveClientCertificates(config: EnvironmentConfig, rootDir: PathLike): Promise<void> {
  if (config.clientCertificates) {
    for (const [, value] of Object.entries(config.clientCertificates)) {
      if (value.cert) {
        value.cert = (await toAbsoluteFilename(value.cert, rootDir)) || value.cert;
      }
      if (value.key) {
        value.key = (await toAbsoluteFilename(value.key, rootDir)) || value.key;
      }
      if (value.pfx) {
        value.pfx = (await toAbsoluteFilename(value.pfx, rootDir)) || value.pfx;
      }
    }
  }
}

interface PackageJson {
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
}

export async function getPlugins(rootDir: PathLike): Promise<Record<string, ConfigureHooks>> {
  const packageJson = await getPackageJson(rootDir);
  const hooks: Record<string, ConfigureHooks> = {};
  if (packageJson?.json) {
    const plugins = [
      ...Object.keys(packageJson.json.dependencies || {}),
      ...Object.keys(packageJson.json.devDependencies || {}),
    ].filter(isPlugin);
    for (const dep of plugins) {
      const fsPath = io.fileProvider.fsPath(packageJson.dir);
      if (fsPath && io.javascriptProvider.loadModule) {
        const hook = io.javascriptProvider.loadModule<ConfigureHooks>(dep, fsPath);
        if (hook) {
          hooks[dep] = hook;
        }
      }
    }
  }
  return hooks;
}
async function getPackageJson(rootDir: PathLike) {
  const packageDir = await findRootDir(rootDir, 'package.json');

  if (packageDir) {
    return {
      dir: packageDir,
      json: await parseJson<PackageJson>(io.fileProvider.joinPath(packageDir, 'package.json')),
    };
  }
  return undefined;
}

function isPlugin(dep: string) {
  return /^(httpyac-|@[\w-]+(\.)?[\w-]+\/httpyac-)plugin-/u.test(dep);
}
