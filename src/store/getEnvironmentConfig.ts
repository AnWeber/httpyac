import { default as chalk } from 'chalk';
import merge from 'lodash/merge';

import { log } from '../io';
import * as models from '../models';
import * as utils from '../utils';

export async function getEnvironmentConfig(
  config?: models.EnvironmentConfig,
  httpFile?: models.HttpFile
): Promise<models.EnvironmentConfig> {
  const environmentConfigs: Array<models.EnvironmentConfig> = [];
  if (httpFile) {
    const fileConfig = await utils.getHttpyacConfig(httpFile.fileName, httpFile.rootDir);
    if (fileConfig) {
      environmentConfigs.push(fileConfig);
    }
  }
  if (config) {
    environmentConfigs.push(config);
  }

  const result = merge(
    {
      log: {
        level: models.LogLevel.warn,
        supportAnsiColors: true,
      },
      cookieJarEnabled: true,
      envDirName: 'env',
    },
    ...environmentConfigs
  );

  refreshStaticConfig(result);
  return result;
}

function refreshStaticConfig(config: models.EnvironmentConfig) {
  if (typeof config?.log?.level === 'undefined') {
    log.options.level = models.LogLevel.warn;
  } else {
    log.options.level = config?.log?.level;
  }
  if (config?.log?.supportAnsiColors === false) {
    chalk.level = 0;
  }
}
