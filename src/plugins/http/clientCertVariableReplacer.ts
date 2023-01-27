import { fileProvider } from '../../io';
import * as models from '../../models';
import { toAbsoluteFilename, isString, isHttpRequest } from '../../utils';
import { URL } from 'url';

export async function clientCertVariableReplacer(
  text: unknown,
  type: models.VariableType | string,
  context: models.ProcessorContext
): Promise<unknown> {
  const { request, httpRegion, httpFile } = context;
  if (isString(text) && isHttpRequest(request) && !httpRegion.metaData.noClientCert) {
    if (type === models.VariableType.url && context.config?.clientCertificates) {
      const url = createUrl(text);
      if (url) {
        const clientCertificateOptions = context.config?.clientCertificates[url.host];
        if (clientCertificateOptions) {
          await setClientCertificateOptions(request, clientCertificateOptions, httpFile);
        }
      }
    } else if (type.toLowerCase().endsWith('clientcert')) {
      const match =
        /^\s*(cert:\s*(?<cert>[^\s]*)\s*)?(key:\s*(?<key>[^\s]*)\s*)?(pfx:\s*(?<pfx>[^\s]*)\s*)?(passphrase:\s*(?<passphrase>[^\s]*)\s*)?\s*$/u.exec(
          text
        );
      if (match?.groups?.cert || match?.groups?.pfx) {
        await setClientCertificateOptions(
          request,
          {
            cert: match.groups.cert,
            key: match.groups.key,
            pfx: match.groups.pfx,
            passphrase: match.groups.passphrase,
          },
          httpFile
        );
        return undefined;
      }
    }
  }
  return text;
}

function createUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch (err) {
    return undefined;
  }
}

async function setClientCertificateOptions(
  request: models.HttpRequest,
  clientCertificateOptions: models.ClientCertificateOptions,
  httpFile: models.HttpFile
) {
  const dir = fileProvider.dirname(httpFile.fileName);
  if (!request.options) {
    request.options = {};
  }
  request.options.https = Object.assign({}, request.options.https, {
    certificate: await resolveFile(clientCertificateOptions.cert, dir),
    key: await resolveFile(clientCertificateOptions.key, dir),
    pfx: await resolveFile(clientCertificateOptions.pfx, dir),
    passphrase: clientCertificateOptions.passphrase,
  });
}

async function resolveFile(
  fileName: models.PathLike | undefined,
  dir: models.PathLike | undefined
): Promise<Buffer | undefined> {
  if (fileName) {
    if (isString(fileName)) {
      const file = await toAbsoluteFilename(fileName, dir);
      if (file) {
        return await fileProvider.readBuffer(file);
      }
    } else {
      return await fileProvider.readBuffer(fileName);
    }
  }
  return undefined;
}
