import { HttpClient, Progress } from '../../../models';
import { OpenIdConfiguration } from './openIdConfiguration';
import { OpenIdInformation } from './openIdInformation';


export interface OpenIdFlow{
  supportsFlow(flow: string): boolean;
  getCacheKey(config: OpenIdConfiguration): string | false;
  perform(config: OpenIdConfiguration, context: {httpClient: HttpClient, progress?: Progress | undefined, cacheKey: string}): Promise<OpenIdInformation | false>
}