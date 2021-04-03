import { ProcessorContext } from '../../models';
import { toAbsoluteFilename } from '../../utils';
import { promises as fs } from 'fs';
import { URL } from 'url';
import { environmentStore } from '../../environments';



export async function clientCertVariableReplacer(text: string, type: string, { request, httpFile }: ProcessorContext) {
  if (type.toLowerCase().endsWith("url") && environmentStore.environmentConfig?.clientCertificates && request) {
    const url = new URL(text);
    const clientCertifcateOptions = environmentStore.environmentConfig?.clientCertificates[url.host];
    if (clientCertifcateOptions) {
      request.https = Object.assign({}, request.https, {
        certificate: await resolveFile(clientCertifcateOptions.cert, httpFile.fileName),
        key: await resolveFile(clientCertifcateOptions.key, httpFile.fileName),
        pfx: await resolveFile(clientCertifcateOptions.pfx, httpFile.fileName),
        passphrase: clientCertifcateOptions.passphrase
      });
      return undefined;
    }
  }
  return text;
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