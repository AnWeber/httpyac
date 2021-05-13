import { ClientCertificateOptions, HttpFile, HttpRequest, ProcessorContext, VariableReplacer, VariableReplacerType, VariableType } from '../../models';
import { toAbsoluteFilename, isString } from '../../utils';
import { URL } from 'url';
import { environmentStore } from '../../environments';
import { ParserRegex } from '../../parser';
import { fileProvider, PathLike } from '../../fileProvider';

export class ClientCertVariableReplacer implements VariableReplacer {
  type = VariableReplacerType.clientCertificate;
  async replace(text: string, type: VariableType | string, context: ProcessorContext): Promise<string | undefined> {
    const { request, httpRegion, httpFile } = context;
    if (request && !httpRegion.metaData.noClientCert) {
      if (type === VariableType.url && environmentStore.environmentConfig?.clientCertificates) {
        const url = new URL(text);
        const clientCertifcateOptions = environmentStore.environmentConfig?.clientCertificates[url.host];
        if (clientCertifcateOptions) {
          await this.setClientCertificateOptions(request, clientCertifcateOptions, httpFile);
        }
      } else if (type.toLowerCase().endsWith('clientcert')) {
        const match = ParserRegex.auth.clientCert.exec(text);
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


  private async resolveFile(fileName: PathLike | undefined, currentFilename: PathLike): Promise<Buffer | undefined> {
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
}
