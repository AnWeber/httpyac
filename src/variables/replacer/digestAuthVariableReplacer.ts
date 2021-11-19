import { ProcessorContext } from '../../models';
import { ParserRegex } from '../../parser';
import { isHttpRequest, isString } from '../../utils';
import { createHash } from 'crypto';
import { CancelableRequest, OptionsOfUnknownResponseBody, Response } from 'got';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

export async function digestAuthVariableReplacer(
  text: unknown,
  type: string,
  { request }: ProcessorContext
): Promise<unknown> {
  if (type.toLowerCase() === 'authorization' && isString(text) && isHttpRequest(request)) {
    const match = ParserRegex.auth.digest.exec(text);

    if (match && match.groups && match.groups.user && match.groups.password) {
      if (!request.hooks) {
        request.hooks = {};
      }
      if (!request.hooks.afterResponse) {
        request.hooks.afterResponse = [];
      }
      request.hooks.afterResponse.push(digestFactory(match.groups.user, match.groups.password));
      return undefined;
    }
  }
  return text;
}

function digestFactory(username: string, password: string) {
  return function digestAfterResponse(
    response: Response,
    retryWithMergedOptions: (options: OptionsOfUnknownResponseBody) => CancelableRequest<Response>
  ) {
    const wwwAuthenticate = response.headers['www-authenticate'];
    if (response.statusCode === 401 && wwwAuthenticate && wwwAuthenticate.toLowerCase().startsWith('digest')) {
      const url = new URL(response.url);
      const challenge = {
        qop: '',
        algorithm: '',
        realm: '',
        nonce: '',
        opaque: '',
      };

      /* see https://github.com/request/request/blob/master/lib/auth.js#L63-L123*/
      updateChallenge(challenge, wwwAuthenticate);

      const qop = /(^|,)\s*auth\s*($|,)/u.test(challenge.qop) && 'auth';
      const nc = qop && '00000001';
      const cnonce = qop && uuidv4().replace(/-/gu, '');
      const ha1 = ha1Compute(challenge.algorithm, username, password, challenge.realm, challenge.nonce, cnonce);
      const ha2 = md5(`${response.request.options.method}:${url.pathname}`);
      const digestResponse = qop
        ? md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
        : md5(`${ha1}:${challenge.nonce}:${ha2}`);

      return retryWithMergedOptions({
        headers: {
          authorization: `Digest ${createDigestHeader({
            username,
            realm: challenge.realm,
            nonce: challenge.nonce,
            uri: url.pathname,
            qop,
            response: digestResponse,
            nc,
            cnonce,
            algorithm: challenge.algorithm,
            opaque: challenge.opaque,
          })}`,
        },
      });
    }

    return response;
  };
}

function createDigestHeader(authValues: Record<string, string | boolean>) {
  const authParams: string[] = [];
  for (const [key, value] of Object.entries(authValues)) {
    if (value) {
      if (['qop', 'nc', 'algorithm'].indexOf(key) >= 0) {
        authParams.push(`${key}=${value}`);
      } else {
        authParams.push(`${key}="${value}"`);
      }
    }
  }
  return authParams.join(', ');
}

function md5(value: string | Buffer) {
  // lgtm [js/weak-cryptographic-algorithm, js/insufficient-password-hash]
  return createHash('md5').update(value).digest('hex');
}

function ha1Compute(
  algorithm: string | undefined,
  username: string,
  password: string,
  realm: string,
  nonce: string,
  cnonce: string | false
) {
  const ha1 = md5(`${username}:${realm}:${password}`);
  if (cnonce && algorithm?.toLowerCase() === 'md5-sess') {
    return md5(`${ha1}:${nonce}:${cnonce}`);
  }
  return ha1;
}

function updateChallenge(challenge: Record<string, string>, wwwAuthenticate: string) {
  for (const item of wwwAuthenticate.split(',')) {
    const match = /([a-z0-9_-]+)=(?:"([^"]+)"|([a-z0-9_-]+))/giu.exec(item);
    if (match) {
      challenge[match[1]] = match[2] || match[3];
    }
  }
}
