import { ClientCertificateOptions, HttpFile, HttpRequest, ProcessorContext, VariableReplacerType } from '../../models';
import { toAbsoluteFilename } from '../../utils';
import { promises as fs } from 'fs';
import { URL } from 'url';
import { environmentStore } from '../../environments';



export async function clientCertVariableReplacer(text: string, type: VariableReplacerType | string, { request, httpRegion, httpFile }: ProcessorContext) {
  if (request && !httpRegion.metaData.noClientCert) {
    if (type === VariableReplacerType.url && environmentStore.environmentConfig?.clientCertificates) {
      const url = new URL(text);
      const clientCertifcateOptions = environmentStore.environmentConfig?.clientCertificates[url.host];
      if (clientCertifcateOptions) {
        await setClientCertificateOptions(request, clientCertifcateOptions, httpFile);
      }
    } else if (type.toLowerCase().endsWith('clientcert')) {
      const match = /^\s*(cert:\s*(?<cert>[^\s]*)\s*)?(key:\s*(?<key>[^\s]*)\s*)?(pfx:\s*(?<pfx>[^\s]*)\s*)?(passphrase:\s*(?<passphrase>[^\s]*)\s*)?\s*$/.exec(text);
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


async function resolveFile(fileName: string | undefined, currentFilename: string): Promise<any | undefined> {
  if (fileName) {
    const file = await toAbsoluteFilename(fileName, currentFilename);
    if (file) {
      return await fs.readFile(file);
    }
  }
  return undefined;
}