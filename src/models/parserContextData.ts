import { ScriptData } from '../actionProcessor';
import { HttpRequestBodyLine } from './httpRequest';
import { HttpSymbol } from './httpSymbol';




export interface ParserEveryRequestScript {
  scriptData: ScriptData,
  postScript: boolean
}

export interface ParserRequestBody{
  textLines: Array<HttpRequestBodyLine>;
  symbol?: HttpSymbol;
}



export interface ParserContextData {
  request_body?: ParserRequestBody,
  httpResponseSymbol?: HttpSymbol,
  gql?: Record<string, string>,
  jsOnEveryRequest?: ParserEveryRequestScript[],
  readonly [key: string]: unknown;
}

