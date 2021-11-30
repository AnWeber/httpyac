import { RequestBodyImport } from './httpRequest';
import { HttpSymbol } from './httpSymbol';

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
  readonly [key: string]: unknown;
}
