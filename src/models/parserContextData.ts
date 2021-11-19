import { RequestBodyImport } from './httpRequest';
import { HttpSymbol } from './httpSymbol';
import { ScriptData } from './scriptData';

export interface ParserEveryRequestScript {
  scriptData: ScriptData;
  event: string;
}

export interface ParserRequestBody {
  rawBody: Array<string | RequestBodyImport>;
  symbol?: HttpSymbol;
}

export interface ParserContextData {
  metaTitle?: string;
  request_body?: ParserRequestBody;
  httpResponseSymbol?: {
    symbol: HttpSymbol;
    body: Array<string>;
  };
  gql?: Record<string, string>;
  jsOnEveryRequest?: ParserEveryRequestScript[];
  readonly [key: string]: unknown;
}
