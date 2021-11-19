/**
 * The file provides stubs for JavaScript objects accessible from HTTP Client response handler scripts.
 * It doesn't perform any real operation and should be used for documentation purpose.
 */

/**
 * HTTP Client session meta data, e.g. list of global variables.
 *
 * HTTP Client session is started on IDE start and ends on IDE close,
 * values are not preserved after IDE restart.
 */
export interface HttpClient {
  /**
   * Global variables defined in response handler scripts,
   * can be used as variables in HTTP Requests,
   *
   * Example:
   * ### Authorization request, receives token as an attribute of json body
   * GET https://example.com/auth
   *
   * > {% client.global.set("auth_token", response.body.token) %}
   *
   * ### Request executed with received auth_token
   * GET http://example.com/get
   * Authorization: Bearer {{auth_token}}
   */
  global: Variables;

  /**
   * Creates test with name 'testName' and body 'func'.
   * All tests will be executed right after response handler script.
   */
  test(testName: string, func: typeof Function): void;

  /**
   * Checks that condition is true and throw an exception otherwise.
   * @param condition
   * @param message if specified it will be used as an exception message.
   */
  assert(condition: boolean, message?: string): void;

  /**
   * Prints text to the response handler or test stdout and then terminates the line.
   */
  log(text: string): void;
}

/**
 * Variables storage, can be used to define, undefine or retrieve variables.
 */
export interface Variables {
  /**
   * Saves variable with name 'varName' and sets its value to 'varValue'.
   */
  set(varName: string, varValue: string): void;

  /**
   * Returns value of variable 'varName'.
   */
  get(varName: string): unknown; // changed to unknown to support boolean

  /**
   * Checks no variables are defined.
   */
  isEmpty(): boolean;

  /**
   * Removes variable 'varName'.
   * @param varName {string}
   */
  clear(varName: string): void;

  /**
   * Removes all variables.
   */
  clearAll(): void;
}

/**
 * HTTP Response data object, contains information about response content, headers, status, etc.
 */
export interface HttpResponse {
  /**
   * Response content, it is a string or JSON object if response content-type is json.
   */
  body: string | unknown;

  /**
   * Response headers storage.
   */
  headers: ResponseHeaders;

  /**
   * Response status, e.g. 200, 404, etc.
   */
  status: number;

  /**
   * Value of 'Content-Type' response header.
   */
  contentType: ContentType;
}

/**
 * Headers storage, can be use to retrieve data about header value.
 */
export interface ResponseHeaders {
  /**
   * Retrieves the first value of 'headerName' response header or null otherwise.
   */
  valueOf(headerName: string): string | null;

  /**
   * Retrieves all values of 'headerName' response header. Returns empty list if header with 'headerName' doesn't exist.
   */
  valuesOf(headerName: string): string[];
}

/**
 * Content type data object, contains information from 'Content-Type' response header.
 */
export interface ContentType {
  /**
   * MIME type of the response,
   * e.g. 'text/plain', 'text/xml', 'application/json'.
   */
  mimeType: string;

  /**
   * String representation of the response charset,
   * e.g. utf-8.
   */
  charset: string;
}
