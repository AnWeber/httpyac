import { ClientCertificateOptions, HttpFile, HttpRequest, PathLike, ProcessorContext, VariableType } from '../../models';
import { toAbsoluteFilename, isString, isHttpRequest } from '../../utils';
import { URL } from 'url';
import { ParserRegex } from '../../parser';
import { fileProvider } from '../../io';

export async function clientCertVariableReplacer(
  text: unknown,
  type: VariableType | string,
  context: ProcessorContext
): Promise<unknown> {
  const { request, httpRegion, httpFile } = context;
  if (isString(text) && isHttpRequest(request) && !httpRegion.metaData.noClientCert) {
    if (type === VariableType.url && context.config?.clientCertificates) {
      const url = createUrl(text);
      if (url) {
        const clientCertifcateOptions = context.config?.clientCertificates[url.host];
        if (clientCertifcateOptions) {
          await setClientCertificateOptions(request, clientCertifcateOptions, httpFile);
        }
      }
    } else if (type.toLowerCase().endsWith('clientcert')) {
      const match = ParserRegex.auth.clientCert.exec(text);
      if (match?.groups?.cert || match?.groups?.pfx) {
        await setClientCertificateOptions(request, {
          cert: match.groups.cert,
          key: match.groups.key,
          pfx: match.groups.pfx,
          passphrase: match.groups.passphrase,
        }, httpFile);
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

async function setClientCertificateOptions(request: HttpRequest, clientCertifcateOptions: ClientCertificateOptions, httpFile: HttpFile) {
  const dir = fileProvider.dirname(httpFile.fileName);
  request.https = Object.assign({}, request.https, {
    certificate: await resolveFile(clientCertifcateOptions.cert, dir),
    key: await resolveFile(clientCertifcateOptions.key, dir),
    pfx: await resolveFile(clientCertifcateOptions.pfx, dir),
    passphrase: clientCertifcateOptions.passphrase
  });
}


async function resolveFile(fileName: PathLike | undefined, dir: PathLike | undefined): Promise<Buffer | undefined> {
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
