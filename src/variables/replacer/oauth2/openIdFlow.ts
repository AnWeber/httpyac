import { HttpClient, RequestLogger, Progress, Variables } from '../../../models';
import { OpenIdConfiguration } from './openIdConfiguration';
import { OpenIdInformation } from './openIdInformation';

export interface OpenIdFlowContext {
  progress?: Progress | undefined;
  httpClient: HttpClient;
  logResponse?: RequestLogger;
  variables: Variables;
}

export interface OpenIdFlow {
  supportsFlow(flow: string): boolean;
  getCacheKey(config: OpenIdConfiguration): string | false;
  perform(config: OpenIdConfiguration, context: OpenIdFlowContext): Promise<OpenIdInformation | false>;
}
