
import { HttpRegion, HttpFile} from '../httpRegion';
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from './httpRegionParser';
import { httpFileStore } from '../httpFileStore';
import { log } from '../logger';
import { promises as fs } from 'fs';
import { normalizeFileName } from '../utils';
import { refMetaHttpRegionActionProcessor } from '../actionProcessor';
export class MetaHttpRegionParser implements HttpRegionParser{
  static isMetaTag(textLine: string) {
    return /^\s*\#{1,}/.test(textLine);
  }

  private isDelimiter(textLine: string) {
    return /^\#{3,}\s*$/.test(textLine);
  }

  async parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, httpFile: HttpFile): Promise<HttpRegionParserResult>{
    const next = lineReader.next();
    if (!next.done) {
      const textLine = next.value.textLine;
      if (MetaHttpRegionParser.isMetaTag(textLine)) {
        const result: HttpRegionParserResult =  {
          endLine: next.value.line,
        };
        if (this.isDelimiter(textLine)) {
          result.newRegion = true;
        } else {
          const match = /^\s*\#{1,}\s+\@(?<key>[^\s]*)(\s+)?(?<value>[^\s]+)?$/.exec(textLine);
          if (match && match.groups && match.groups.key) {
            switch (match.groups.key) {
              case 'import':
                if (match.groups.value) {
                  await importHttpFile(httpFile, match.groups.value);
                }
                break;
              case 'ref':
                if (match.groups.value) {
                  addRefHttpRegion(httpRegion, match.groups.value, false);
                }
                break;
              case 'forceRef':
                if (match.groups.value) {
                  addRefHttpRegion(httpRegion, match.groups.value, true);
                }
                break;
              default:
                httpRegion.metaParams = Object.assign(httpRegion.metaParams || {}, {
                  [match.groups.key]: match.groups.value || true,
                });
                break;
            }
          }
        }
        return result;
      }
    }
    return false;
  }
}
async function importHttpFile(httpFile: HttpFile, fileName: string) {
  try {
    const absoluteFileName = await normalizeFileName(fileName, httpFile.fileName);
    if (absoluteFileName) {
      if (!httpFile.imports) {
        httpFile.imports = [];
      }
      httpFile.imports.push(() => httpFileStore.getOrCreate(absoluteFileName, () => fs.readFile(absoluteFileName, 'utf-8'), 0));
    }
  } catch (err) {
    log.debug('import error', fileName, err);
  }
}

function addRefHttpRegion(httpRegion: HttpRegion, name: string, force: boolean) {
  httpRegion.actions.push({
    type: 'ref',
    processor: refMetaHttpRegionActionProcessor,
    data: {
      name,
      force
    }
  });
}


