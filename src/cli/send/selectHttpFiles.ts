import * as models from '../../models';
import * as utils from '../../utils';
import { SendOptions } from './options';

type SelectActionResult = Array<{ httpRegions?: Array<models.HttpRegion>; httpFile: models.HttpFile }>;

export async function selectHttpFiles(
  httpFiles: Array<models.HttpFile>,
  cliOptions: SendOptions
): Promise<SelectActionResult> {
  if (cliOptions.all) {
    return httpFiles.map(httpFile => ({
      httpFile,
    }));
  }
  const resultWithArgs = selectHttpFilesWithArgs(httpFiles, cliOptions);
  if (resultWithArgs.length > 0) {
    return resultWithArgs;
  }
  return await selectManualHttpFiles(httpFiles);
}

function selectHttpFilesWithArgs(httpFiles: Array<models.HttpFile>, cliOptions: SendOptions) {
  const result: SelectActionResult = [];

  for (const httpFile of httpFiles) {
    const httpRegions = httpFile.httpRegions.filter(h => {
      if (hasName(h, cliOptions.name)) {
        return true;
      }
      if (hasTag(h, cliOptions.tag)) {
        return true;
      }
      if (isLine(h, cliOptions.line)) {
        return true;
      }
      return false;
    });
    if (httpRegions.length > 0) {
      result.push({
        httpFile,
        httpRegions,
      });
    }
  }
  return result;
}

function hasName(httpRegion: models.HttpRegion, name: string | undefined) {
  if (name) {
    return httpRegion.metaData?.name === name;
  }
  return false;
}

function isLine(httpRegion: models.HttpRegion, line: number | undefined) {
  if (line !== undefined) {
    return line && httpRegion.symbol.startLine <= line && httpRegion.symbol.endLine >= line;
  }
  return false;
}

function hasTag(httpRegion: models.HttpRegion, tags: Array<string> | undefined) {
  if (tags && utils.isString(httpRegion.metaData?.tag)) {
    const metaDataTag = httpRegion.metaData.tag?.split(',').map(t => t.trim());
    return tags.some(t => metaDataTag.includes(t));
  }
  return false;
}

async function selectManualHttpFiles(httpFiles: Array<models.HttpFile>): Promise<SelectActionResult> {
  const httpRegionMap: Record<string, SelectActionResult> = {};
  const hasManyFiles = httpFiles.length > 1;
  const cwd = `${process.cwd()}`;
  for (const httpFile of httpFiles) {
    const fileName = utils.ensureString(httpFile.fileName)?.replace(cwd, '.');
    httpRegionMap[hasManyFiles ? `${fileName}: all` : 'all'] = [{ httpFile }];

    for (const httpRegion of httpFile.httpRegions) {
      if (!httpRegion.isGlobal()) {
        const name = httpRegion.symbol.name;
        httpRegionMap[hasManyFiles ? `${fileName}: ${name}` : name] = [
          {
            httpRegions: [httpRegion],
            httpFile,
          },
        ];
      }
    }
  }
  const inquirer = await import('inquirer');
  const answer = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'region',
      message: 'please choose which region to use',
      choices: Object.entries(httpRegionMap).map(([key]) => key),
    },
  ]);
  if (answer.region && httpRegionMap[answer.region]) {
    return httpRegionMap[answer.region];
  }
  return [];
}
