import { PathLike } from '../fileProvider';

export interface ClientCertificateOptions{
  cert?: PathLike;
  key?: PathLike;
  pfx?: PathLike;
  passphrase?: string;
}
