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
   * SHA-384 digest builder
   */
  sha384(): DigestBuilder;

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
   * SHA-384 HMAC builder
   */
  sha384(): HmacInitializer;

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
