import { HttpClient, HttpClientRequest, HttpResponse } from './http-client';
import { jsonPath } from './http-client.common';
import { CryptoSupport } from './http-client.crypto';
import { PreRequestHttpClientRequest } from './http-client.pre-request';

export interface IntellijJavascriptGlobal extends Record<string, unknown> {
  request?: HttpClientRequest | PreRequestHttpClientRequest;
  client: HttpClient;
  crypto: CryptoSupport;
  jsonPath?: jsonPath; // not implemented
  $exampleServer?: string; // not implemented
  /**
   * The object holds information about HTTP Response.
   */
  response?: HttpResponse;
}
