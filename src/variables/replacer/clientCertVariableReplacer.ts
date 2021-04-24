import { ClientCertificateOptions, HttpFile, HttpRequest, ProcessorContext, VariableReplacer, VariableReplacerType } from '../../models';
import { toAbsoluteFilename } from '../../utils';
import { promises as fs } from 'fs';
import { URL } from 'url';
import { environmentStore } from '../../environments';

export class ClientCertVariableReplacer implements VariableReplacer {
  type = 'clientCert';
  async replace(text: string, type: VariableReplacerType | string, context: ProcessorContext): Promise<string | undefined> {
    const { request, httpRegion, httpFile } = context;
    if (request && !httpRegion.metaData.noClientCert) {
      if (type === VariableReplacerType.url && environmentStore.environmentConfig?.clientCertificates) {
        const url = new URL(text);
        const clientCertifcateOptions = environmentStore.environmentConfig?.clientCertificates[url.host];
        if (clientCertifcateOptions) {
          await this.setClientCertificateOptions(request, clientCertifcateOptions, httpFile);
        }
      } else if (type.toLowerCase().endsWith('clientcert')) {
        const match = /^\s*(cert:\s*(?<cert>[^\s]*)\s*)?(key:\s*(?<key>[^\s]*)\s*)?(pfx:\s*(?<pfx>[^\s]*)\s*)?(passphrase:\s*(?<passphrase>[^\s]*)\s*)?\s*$/u.exec(text);
        if (match?.groups?.cert || match?.groups?.pfx) {
          await this.setClientCertificateOptions(request, {
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

  private async setClientCertificateOptions(request: HttpRequest, clientCertifcateOptions: ClientCertificateOptions, httpFile: HttpFile) {
    request.https = Object.assign({}, request.https, {
      certificate: await this.resolveFile(clientCertifcateOptions.cert, httpFile.fileName),
      key: await this.resolveFile(clientCertifcateOptions.key, httpFile.fileName),
      pfx: await this.resolveFile(clientCertifcateOptions.pfx, httpFile.fileName),
      passphrase: clientCertifcateOptions.passphrase
    });
  }


  private async resolveFile(fileName: string | undefined, currentFilename: string): Promise<unknown | undefined> {
    if (fileName) {
      const file = await toAbsoluteFilename(fileName, currentFilename);
      if (file) {
        return await fs.readFile(file);
      }
    }
    return undefined;
  }
}
