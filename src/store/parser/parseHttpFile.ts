import { HookCancel } from 'hookpoint';

import * as models from '../../models';
import * as utils from '../../utils';
import { HttpRegion } from '../httpRegion';
import { closeHttpRegion } from './closeHttpRegion';
import { createReaderFactory } from './createReaderFactory';
import { setSource } from './setSource';

export async function parseHttpFile(
  httpFile: models.HttpFile,
  text: string,
  httpFileStore: models.HttpFileStore
): Promise<models.HttpFile> {
  const lines = utils.toMultiLineArray(text);

  const parserContext: models.ParserContext = {
    lines,
    httpFile,
    httpRegion: new HttpRegion(httpFile, 0),
    data: {},
    httpFileStore,
  };

  for (let line = 0; line < lines.length; line++) {
    const httpRegionParserResult = await httpFile.hooks.parse.trigger(createReaderFactory(line, lines), parserContext);
    if (httpRegionParserResult && httpRegionParserResult !== HookCancel) {
      if (httpRegionParserResult.endRegionLine !== undefined && httpRegionParserResult.endRegionLine >= 0) {
        parserContext.httpRegion.symbol.endLine = httpRegionParserResult.endRegionLine;
        parserContext.httpRegion.symbol.endOffset = lines[httpRegionParserResult.endRegionLine].length;
        await closeHttpRegion(parserContext);
        parserContext.httpRegion = new HttpRegion(httpFile, httpRegionParserResult.nextParserLine + 1);
      }
      if (httpRegionParserResult.symbols) {
        if (parserContext.httpRegion.symbol.children) {
          parserContext.httpRegion.symbol.children.push(...httpRegionParserResult.symbols);
        } else {
          parserContext.httpRegion.symbol.children = httpRegionParserResult.symbols;
        }
      }
      line = httpRegionParserResult.nextParserLine;
    }
  }

  await closeHttpRegion(parserContext);
  parserContext.httpRegion.symbol.endLine = lines.length - 1;
  parserContext.httpRegion.symbol.endOffset = lines[lines.length - 1].length;
  setSource(httpFile.httpRegions, lines);
  return httpFile;
}
