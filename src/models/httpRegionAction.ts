import { ProcessorContext } from './processorContext';

/**
 * @returns false if processing cancelled
 */
export interface HttpRegionAction {
  id: ActionType | string;
  process(context: ProcessorContext): Promise<boolean>;
}

export enum ActionType {
  cookieJar = 'cookieJar',
  defaultHeaders = 'defaultHeaders',
  eventSourceClient = 'eventSourceClient',
  intellij = 'intellij',
  gql = 'gql',
  loop = 'loop',
  js = 'js',
  protoImport = 'protoImport',
  protoCreate = 'protoCreate',
  grpcClient = 'grpcClient',
  httpClient = 'httpClient',
  import = 'import',
  ref = 'ref',
  variable = 'variable',
  websocketClient = 'websocketClient',
}
