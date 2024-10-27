import * as io from '../io';
import { ConfigureHooks, EnvironmentConfig, PathLike } from '../models';
import { findRootDir, iterateUntilRoot, toAbsoluteFilename } from './fsUtils';

export async function getHttpyacConfig(
  filename: PathLike,
  rootDir: PathLike | undefined
): Promise<EnvironmentConfig | undefined> {
  let result: EnvironmentConfig | undefined;
  if (rootDir) {
    result = await loadFileConfig(rootDir);
    if (!result) {
      result = await loadPackageJsonConig(filename, rootDir);
    }
    if (result) {
      await resolveClientCertificates(result, rootDir);
    }
  }
  return result;
}

export const defaultConfigFiles = [
  '.httpyac.js',
  '.httpyac.cjs',
  '.httpyac.config.js',
  '.httpyac.config.cjs',
  'httpyac.config.js',
  'httpyac.config.cjs',
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

async function loadPackageJsonConig(filename: PathLike, rootDir: PathLike) {
  const result: Array<EnvironmentConfig> = [];
  await iterateUntilRoot(filename, rootDir, async dir => {
    const config = (await parseJson<{ httpyac?: EnvironmentConfig }>(io.fileProvider.joinPath(dir, 'package.json')))
      ?.httpyac;
    if (config) {
      result.push(config);
    }
  });
  if (result.length > 0) {
    return Object.assign({}, ...result.reverse());
  }
  return undefined;
}

export async function parseJson<T>(fileName: PathLike): Promise<T | undefined> {
  try {
    if (await io.fileProvider.exists(fileName)) {
      const text = await io.fileProvider.readFile(fileName, 'utf-8');
      return JSON.parse(text);
    }
  } catch (err) {
    io.log.debug(`json parse of ${fileName} failed`, err);
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
