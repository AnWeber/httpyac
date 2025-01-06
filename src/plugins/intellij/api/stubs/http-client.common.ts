/**
 * HTTP Client session meta data, e.g. list of global variables.
 *
 * HTTP Client session is started on IDE start and ends on IDE close,
 * values are not preserved after IDE restart.
 */
export interface CommonHttpClient {
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
   * Prints an array of `args` to the response handler or test stdout with separator and then terminates the line.
   * If an element of `args` is not `string`, the function converts it to string.
   * Also, it prints JS objects and arrays as their `JSON.stringify` presentation.
   */
  log(...args: unknown[]): void;
}

/**
 * Variables storage, can be used to define, undefine or retrieve variables.
 */
export interface Variables {
  /**
   * Saves variable with name 'varName' and sets its value to 'varValue'.
   */
  set(varName: string, varValue: unknown): void;

  /**
   * Returns value of variable 'varName'.
   */
  get(varName: string): unknown;

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
 * Information about request, including variables, URL and e.t.c.
 */
export interface CommonHttpClientRequest {
  /**
   * Environment used for sending this request
   */
  environment: RequestEnvironment;

  /**
   * Current request variables, which can be updated in Pre-request handler script.
   * Those variables are not shared between requests.
   */
  variables: RequestVariables;

  /**
   * Header of the current request.
   */
  headers: RequestHeaders;

  /**
   * Method of the current request
   */
  method: string;

  // currently not supported
  // iteration(): number;
  // currently not supported
  // templateValue(expressionNumber: number): string | boolean | number;
}

/**
 * Object for accessing headers of the current request.
 */
export interface RequestHeaders {
  /**
   * Array of all headers
   */
  all(): CommonRequestHeader[];

  /**
   * Searches header by its name, returns null is there is not such header.
   * @param name header name for searching
   */
  findByName(name: string): CommonRequestHeader | null;
}

/**
 * Environment used for sending request.
 * Contains environment variables from http-client.env.json and http-client.private.env.json files.
 */
export interface RequestEnvironment {
  /**
   * Retrieves variable value by its name. Returns null if there is no such variable.
   * @param name variable name.
   */
  get(name: string): string | null;
}

/**
 * Variables for constructing current request. Can be updated in Pre-request handler script.
 */
interface RequestVariables {
  /**
   * Retrieves request variable value by its name. Returns null if there is no such variable
   * @param name request variable name
   */
  get(name: string): unknown;
}

/**
 * Information about request header
 */
export interface CommonRequestHeader {
  /**
   * Header name
   */
  name: string;
}

/**
 * Retrieves a value from a JSON object using a JSONPath expression.
 *
 * @param {any} obj - The JSON object to search in.
 * @param {string} expression - The JSONPath expression to use for searching.
 * @return {any} - The value found in the JSON object using the JSONPath expression.
 */
export type jsonPath = (obj: unknown, expression: string) => unknown;

/**
 * Retrieves a value from a XML object using a XPath expression.
 *
 * @param {any} obj - The obj to search in with XPath expression:
 *                    - if obj is Node, Element or  Document returns result of search with expression.
 *                    - null in all other cases.
 * @param {string} expression - The XPath expression to use for searching.
 * @return {any} - The value found in the XML object using the XPath expression.
 */
export type xpath = (obj: unknown, expression: string) => unknown;

export interface CommonWindow {
  atob(str: string): string;
  btoa(bytes: string): string;
}
