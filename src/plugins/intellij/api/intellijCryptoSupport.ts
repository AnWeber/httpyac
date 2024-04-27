import { createHash, createHmac, Hash, Hmac } from 'crypto';

import * as utils from '../../../utils';
import { CryptoSupport, Digest, DigestBuilder, HmacInitializer, HmacSupport } from './stubs';

export class IntellijCryptoSupport implements CryptoSupport {
  constructor() {
    this.hmac = new IntellijHmacSupport();
  }
  sha1(): DigestBuilder {
    return new IntellijDigestBuilder(createHash('sha1'));
  }
  sha256(): DigestBuilder {
    return new IntellijDigestBuilder(createHash('sha256'));
  }
  sha384(): DigestBuilder {
    return new IntellijDigestBuilder(createHash('sha384'));
  }
  sha512(): DigestBuilder {
    return new IntellijDigestBuilder(createHash('sha512'));
  }
  md5(): DigestBuilder {
    return new IntellijDigestBuilder(createHash('md5'));
  }
  hmac: HmacSupport;
}

export class IntellijDigestBuilder implements DigestBuilder {
  constructor(private readonly hash: Hash | Hmac) {}
  updateWithText(textInput: string, encoding?: string | undefined): DigestBuilder {
    const bufferEncoding = utils.getBufferEncoding(encoding);
    const result = this.hash.update(Buffer.from(textInput, bufferEncoding));
    return new IntellijDigestBuilder(result);
  }
  updateWithHex(hexInput: string): DigestBuilder {
    const result = this.hash.update(Buffer.from(hexInput, 'hex'));
    return new IntellijDigestBuilder(result);
  }
  updateWithBase64(base64Input: string, urlSafe?: boolean | undefined): DigestBuilder {
    const result = this.hash.update(Buffer.from(base64Input, urlSafe ? 'base64url' : 'base64'));
    return new IntellijDigestBuilder(result);
  }
  digest(): Digest {
    return new IntellijDigest(this.hash);
  }
}

/**
 * Object containing bytes of digest
 */
export class IntellijDigest implements Digest {
  constructor(private readonly hash: Hash | Hmac) {}
  /**
   * Returns bytes encoded as 16-radix HEX string
   */
  toHex(): string {
    if (this.hash instanceof Hmac) {
      return this.hash.digest('hex');
    }
    return this.hash.digest('hex');
  }

  /**
   * Returns bytes encoded as Base64 string
   * @param urlSafe if true, will be used url-safe variant of Base64. By default, false
   */
  toBase64(urlSafe?: boolean): string {
    const encoding = urlSafe ? 'base64url' : 'base64';
    if (this.hash instanceof Hmac) {
      return this.hash.digest(encoding);
    }
    return this.hash.digest(encoding);
  }
}

export class IntellijHmacSupport implements HmacSupport {
  sha1(): HmacInitializer {
    return new IntellijHmacInitializer('sha1');
  }
  sha256(): HmacInitializer {
    return new IntellijHmacInitializer('sha256');
  }
  sha384(): HmacInitializer {
    return new IntellijHmacInitializer('sha384');
  }
  sha512(): HmacInitializer {
    return new IntellijHmacInitializer('sha512');
  }
  md5(): HmacInitializer {
    return new IntellijHmacInitializer('md5');
  }
}

export class IntellijHmacInitializer implements HmacInitializer {
  constructor(private readonly algorithm: string) {}
  withTextSecret(textSecret: string, encoding?: string | undefined): DigestBuilder {
    const hmac = createHmac(this.algorithm, Buffer.from(textSecret, utils.getBufferEncoding(encoding)));
    return new IntellijDigestBuilder(hmac);
  }
  withHexSecret(hexSecret: string): DigestBuilder {
    const hmac = createHmac(this.algorithm, Buffer.from(hexSecret, 'hex'));
    return new IntellijDigestBuilder(hmac);
  }
  withBase64Secret(base64Secret: string, urlSafe?: string | undefined): DigestBuilder {
    const hmac = createHmac(this.algorithm, Buffer.from(base64Secret, urlSafe ? 'base64url' : 'base64'));
    return new IntellijDigestBuilder(hmac);
  }
}
