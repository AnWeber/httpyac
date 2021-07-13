import { ScriptData } from '../actions';
import { RequestBodyImport } from './httpRequest';
import { HttpSymbol } from './httpSymbol';


export interface ParserEveryRequestScript {
  scriptData: ScriptData,
  postScript: boolean
}

export interface ParserRequestBody{
  rawBody: Array<string | RequestBodyImport>;
  symbol?: HttpSymbol;
}


export interface ParserContextData {
  metaDescription?: string;
  request_body?: ParserRequestBody,
  httpResponseSymbol?: {
    symbol: HttpSymbol,
    body: Array<string>,
  },
  gql?: Record<string, string>,
  jsOnEveryRequest?: ParserEveryRequestScript[],
  readonly [key: string]: unknown;
}
