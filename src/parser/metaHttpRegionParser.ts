
import { HttpRegion } from '../httpRegion';
import { HttpRegionParser, HttpRegionParserGenerator, HttpRegionParserResult } from './httpRegionParser';


export class MetaHttpRegionParser implements HttpRegionParser{
  static isMetaTag(textLine: string) {
    return /^\s*\#{1,}/.test(textLine);
  }


  private isDelimiter(textLine: string) {
    return /^\#{3,}\s*$/.test(textLine);
  }

  private isName(textLine: string) {
    return /^\s*\#{1,}\s+(?:((@)name)\s+([^\s\.]+))$/.test(textLine);
  }

  parse(lineReader: HttpRegionParserGenerator, httpRegion: HttpRegion, fileName: string): Promise<HttpRegionParserResult>{
    const next = lineReader.next();
    if (!next.done) {
      const textLine = next.value.textLine;
      if (MetaHttpRegionParser.isMetaTag(textLine)) {
        const result: HttpRegionParserResult =  {
          endLine: next.value.line,
        };
        if (this.isName(textLine)) {
          httpRegion.name = textLine.substring(textLine.indexOf("@name") + "@name".length).trim();
        } else if (this.isDelimiter(textLine)) {
          httpRegion.position.end = next.value.line;
          result.newRegion = true;
        }
        return Promise.resolve(result);
      }
    }
    return Promise.resolve(false);
  }
}
