import { RegionSeparator } from '../../utils';

export function createReaderFactory(startLine: number, lines: Array<string>) {
  return function* createReader(noStopOnMetaTag?: boolean) {
    for (let line = startLine; line < lines.length; line++) {
      const textLine = lines[line];
      yield {
        textLine,
        line,
      };
      if (!noStopOnMetaTag) {
        // if parser region is not closed stop at delimiter
        if (RegionSeparator.test(textLine)) {
          break;
        }
      }
    }
  };
}
