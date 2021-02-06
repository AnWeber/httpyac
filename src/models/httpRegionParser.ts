import { HttpRegionParserResult} from '../models';
import { ParserContext } from './parserContext';

export type HttpRegionParserGenerator = Generator<{ textLine: string; line: number; }, void, unknown>;

export interface HttpRegionParser{
  noStopOnMetaTag?: boolean;
  parse(lineReader: HttpRegionParserGenerator, context: ParserContext): Promise<HttpRegionParserResult>;

  close?(context: ParserContext): void;
}