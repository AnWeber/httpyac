
import { HttpSymbolKind, HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult, ParserContext, HttpFile } from '../models';

import { ScriptData, intellijActionProcessor } from '../actionProcessor';
import { toAbsoluteFilename } from '../utils';
import { log } from '../logger';
import { promises as fs } from 'fs';


export class IntellijFileHttpRegionParser implements HttpRegionParser{
  async parse(lineReader: HttpRegionParserGenerator, { httpRegion, httpFile }: ParserContext): Promise<HttpRegionParserResult> {
    if (httpRegion.request) {
      let next = lineReader.next();

      if (!next.done) {
        const match = /^\s*>\s+(?<file>[^\s{%}]+\s*)$/.exec(next.value.textLine);
        if (!!match?.groups?.file) {
          const script = await this.loadScript(match.groups.file, httpFile);
          if (script) {
            const data: ScriptData = {
              script,
              lineOffset: next.value.line,
            };
            httpRegion.actions.push(
              {
                data,
                type: 'intellij',
                processor: intellijActionProcessor,
              }
            );
            return {
              endLine: next.value.line,
              symbols: [{
                name: 'Intellij Script',
                description: 'Intellij Script',
                kind: HttpSymbolKind.script,
                startLine: next.value.line,
                startOffset: 0,
                endLine: next.value.line,
                endOffset: 0,
              }],
            };
          }
        }
      }
    }
    return false;
  }

  private async loadScript(file: string, httpFile: HttpFile) {
    try {
      let script: string | false = false;
      const filename = await toAbsoluteFilename(file, httpFile.fileName);
      if (filename) {
        script = await fs.readFile(filename, 'utf-8');
      }
      return script;
    } catch (err) {
      log.debug(file, err);
      return false;
    }
  }
}