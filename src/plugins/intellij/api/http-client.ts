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
  exit(): void;
}

/**
 * Represents response as text stream.
 */
export interface TextStreamResponse {
  /**
   * Represents whole stream as one text and subscribes user on each line of this text.
   * @param subscriber function to be called on each line of the stream
   * @param onFinish function to be called after the end of the stream
   */
  onEachLine(subscriber: (line: string | object, unsubscribe: () => void) => void, onFinish?: () => void): void;

  /**
   * Subscribes user to each message sent by server. This method should be used with well-defined streaming protocols,
   * like WebSocket, GRPC and e.t.c.
   * @param subscriber function to be called on each message of the stream. There is possibility to send answers to server via `output`,
   *  if protocol supports both directions
   * @param onFinish function to be called after the end of the stream
   */
  onEachMessage(
    subscriber: (message: string | object, unsubscribe: () => void, output?: (answer: string) => void) => void,
    onFinish?: () => void
  ): void;
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
  body: string | TextStreamResponse | unknown;

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

/**
 * Information about request, including variables, URL and e.t.c.
 */
export interface HttpClientRequest {
  /**
   * Information about current request body
   */
  body: RequestBody;

  /**
   * Information about current request URL
   */
  url: RequestUrl;
  /**
   * Environment used for sending this request
   */
  environment: RequestEnvironment;

  /**
   * Current request variables, which can be updated in Pre-request handler script.
   * Those variables are not shared between requests.
   */
  variables: Variables;

  /**
   * Header of the current request.
   */
  headers: RequestHeaders;
}

/**
 * Interface for accessing current request body. Body may be not yet constructed during Pre-request script
 */
export interface RequestBody {
  /**
   * Gets raw body value, without any substituted variable. So, all {{var}} parts will stay unchanged.
   */
  getRaw(): string;

  /**
   * Tries substitute known variables inside body and returns the result. All known {{var}} will be replaced by theirs values.
   * Unknown {{var}} will stay unchanged.
   */
  tryGetSubstituted(): string;
}

/**
 * Interface for accessing current request URL. URL may be not yet constructed during Pre-request script
 */
export interface RequestUrl {
  /**
   * Gets raw URL value, without any substituted variable. So, all {{var}} parts will stay unchanged.
   */
  getRaw(): string;

  /**
   * Tries substitute known variables inside URL and returns the result. All known {{var}} will be replaced by theirs values.
   * Unknown {{var}} will stay unchanged.
   */
  tryGetSubstituted(): string;
}

/**
 * Object for accessing headers of the current request.
 */
export interface RequestHeaders {
  /**
   * Array of all headers
   */
  all(): Array<RequestHeader>;

  /**
   * Searches header by its name, returns null is there is not such header.
   * @param name header name for searching
   */
  findByName(name: string): RequestHeader | null;
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
export interface RequestVariables {
  /**
   * Retrieves request variable value by its name. Returns null if there is no such variable
   * @param name request variable name
   */
  get(name: string): string | null;
}

/**
 * Information about request header
 */
export interface RequestHeader {
  /**
   * Header name
   */
  name: string;
  /**
   * Value of a request header
   */
  value(): string;

  /**
   * Gets raw header value, without any substituted variable. So, all {{var}} parts will stay unchanged.
   */
  getRawValue(): string;

  /**
   * Tries substitute known variables inside header value and returns the result. All known {{var}} will be replaced by theirs values.
   * Unknown {{var}} will stay unchanged.
   */
  tryGetSubstitutedValue(): string;
}

/**
 * Object for accessing HTTP Client Crypto API
 */

/**
 * Some useful function for cryptography
 */
export interface CryptoSupport {
  /**
   * SHA-1 digest builder
   */
  sha1(): DigestBuilder;

  /**
   * SHA-256 digest builder
   */
  sha256(): DigestBuilder;

  /**
   * SHA-512 digest builder
   */
  sha512(): DigestBuilder;

  /**
   * MD-5 digest builder
   */
  md5(): DigestBuilder;

  /**
   * API for hmac
   */
  hmac: HmacSupport;
}

/**
 * Builder for digests.
 * Sequential calls of `update*` methods append bytes to result message.
 */
export interface DigestBuilder {
  /**
   * Append data presented as text
   * @param textInput data for appending to message
   * @param encoding encoding for decoding text to bytes. By default, UTF-8
   */
  updateWithText(textInput: string, encoding?: string): DigestBuilder;

  /**
   * Append data presented as 16-radix HEX text
   * @param hexInput data for appending to message
   */
  updateWithHex(hexInput: string): DigestBuilder;

  /**
   * Append data presented as Base64 encoded text
   * @param base64Input data for appending to message
   * @param urlSafe is `base64Input` encoded as urlSafe Base64 variant. By default, false
   */
  updateWithBase64(base64Input: string, urlSafe?: boolean): DigestBuilder;

  /**
   * Constructs digest from containing message.
   */
  digest(): Digest;
}

/**
 * Object containing bytes of digest
 */
export interface Digest {
  /**
   * Returns bytes encoded as 16-radix HEX string
   */
  toHex(): string;

  /**
   * Returns bytes encoded as Base64 string
   * @param urlSafe if true, will be used url-safe variant of Base64. By default, false
   */
  toBase64(urlSafe?: boolean): string;
}

/**
 * API for HMAC
 */
export interface HmacSupport {
  /**
   * SHA-1 HMAC builder
   */
  sha1(): HmacInitializer;

  /**
   * SHA-256 HMAC builder
   */
  sha256(): HmacInitializer;

  /**
   * SHA-512 HMAC builder
   */
  sha512(): HmacInitializer;

  /**
   * MD-5 HMAC builder
   */
  md5(): HmacInitializer;
}

/**
 * Object for initializing HMAC with private key (secret).
 */
export interface HmacInitializer {
  /**
   * Initializes HMAC with secret presented as text. Converts to bytes using encoding
   * @param textSecret HMAC secret
   * @param encoding encoding for decoding text. By default, UTF-8
   */
  withTextSecret(textSecret: string, encoding?: string): DigestBuilder;

  /**
   * Initializes HMAC with secret presented as 16-radix HEX string.
   * @param hexSecret HMAC secret
   */
  withHexSecret(hexSecret: string): DigestBuilder;

  /**
   * Initializes HMAC with secret presented as Base64 string.
   * @param base64Secret HMAC secret
   * @param urlSafe is `base64Secret` encoded using urlSafe Base64-variant. By default, false
   */
  withBase64Secret(base64Secret: string, urlSafe?: string): DigestBuilder;
}
