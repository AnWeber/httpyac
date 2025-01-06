// declare const request: HttpClientRequest;

import { CommonHttpClientRequest } from './http-client.common';

export interface PreRequestHttpClientRequest extends CommonHttpClientRequest {
  /**
   * Information about current request body
   */
  body: RequestBody;

  /**
   * Information about current request URL
   */
  url: RequestUrl;
}

export interface PreRequestRequestVariables {
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

export interface PreRequestRequestHeader {
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
