import { ProcessorContext } from './processorContext';


/**
 * @returns false if processing cancelled
 */
export interface HttpRegionAction {
  id: ActionType | string;
  process(context: ProcessorContext): Promise<boolean>;
}

export enum ActionType{
  cookieJar = 'cookieJar',
  envDefaultHeaders = 'envDefaultHeaders',
  defaultHeaders = 'defaultHeaders',
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
  response = 'response',
  variable = 'variable',
  variableReplacer = 'variableReplacer',
  websocketClient = 'websocketClient',
}
