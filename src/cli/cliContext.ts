import { HttpFileSendContext } from '../models';

export type CliContext = Omit<HttpFileSendContext, 'httpFile'>;
