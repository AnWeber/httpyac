import { HttpClient, Progress, RequestLogger } from '../../../models';
import { OpenIdConfiguration } from './openIdConfiguration';
import { OpenIdInformation } from './openIdInformation';


export interface OpenIdFlowContext{
  httpClient: HttpClient,
  progress?: Progress | undefined,
  cacheKey: string,
  logResponse?: RequestLogger,
}

export interface OpenIdFlow{
  supportsFlow(flow: string): boolean;
  getCacheKey(config: OpenIdConfiguration): string | false;
  perform(config: OpenIdConfiguration, context: OpenIdFlowContext): Promise<OpenIdInformation | false>
}
