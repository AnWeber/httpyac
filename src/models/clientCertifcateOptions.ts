import { PathLike } from '../io';

export interface ClientCertificateOptions{
  cert?: PathLike;
  key?: PathLike;
  pfx?: PathLike;
  passphrase?: string;
}
