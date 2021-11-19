import { PathLike } from './pathLike';

export interface ClientCertificateOptions {
  cert?: PathLike;
  key?: PathLike;
  pfx?: PathLike;
  passphrase?: string;
}
