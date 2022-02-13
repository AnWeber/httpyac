import { HttpClient, RequestLogger, Progress, Variables } from '../../../models';
import { OpenIdInformation } from '../../../models/openIdInformation';
import { OpenIdConfiguration } from '../openIdConfiguration';

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
