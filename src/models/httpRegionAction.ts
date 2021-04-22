import { ProcessorContext } from './processorContext';


/**
 * @returns false if processing cancelled
 */
 export interface HttpRegionAction {
  type: ActionType | string;
  process(context: ProcessorContext): Promise<boolean>;
}

export enum ActionType{
  cookieJar = 'cookieJar',
  envDefaultHeaders = 'envDefaultHeaders',
  defaultHeaders = 'defaultHeaders',
  intellij = 'intellij',
  gql = 'gql',
  js = 'js',
  request = 'request',
  httpClient = 'httpClient',
  ref = 'ref',
  response = 'response',
  variable = 'variable',
  variableReplacer = 'variableReplacer',
}