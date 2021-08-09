import { ClientCertificateOptions, HttpFile, HttpRequest, PathLike, ProcessorContext, VariableType } from '../../models';
import { toAbsoluteFilename, isString } from '../../utils';
import { URL } from 'url';
import { ParserRegex } from '../../parser';
import { fileProvider } from '../../io';

export async function clientCertVariableReplacer(
  text: string | undefined,
  type: VariableType | string,
  context: ProcessorContext
): Promise<string | undefined> {
  const { request, httpRegion, httpFile } = context;
  if (text && request && !httpRegion.metaData.noClientCert) {
    if (type === VariableType.url && context.config?.clientCertificates) {
      const url = new URL(text);
      const clientCertifcateOptions = context.config?.clientCertificates[url.host];
      if (clientCertifcateOptions) {
        await setClientCertificateOptions(request, clientCertifcateOptions, httpFile);
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

async function setClientCertificateOptions(request: HttpRequest, clientCertifcateOptions: ClientCertificateOptions, httpFile: HttpFile) {
  request.https = Object.assign({}, request.https, {
    certificate: await resolveFile(clientCertifcateOptions.cert, httpFile.fileName),
    key: await resolveFile(clientCertifcateOptions.key, httpFile.fileName),
    pfx: await resolveFile(clientCertifcateOptions.pfx, httpFile.fileName),
    passphrase: clientCertifcateOptions.passphrase
  });
}


async function resolveFile(fileName: PathLike | undefined, currentFilename: PathLike): Promise<Buffer | undefined> {
  if (fileName) {
    if (isString(fileName)) {
      const file = await toAbsoluteFilename(fileName, currentFilename);
      if (file) {
        return await fileProvider.readBuffer(file);
      }
    } else {
      return await fileProvider.readBuffer(fileName);
    }
  }
  return undefined;
}
