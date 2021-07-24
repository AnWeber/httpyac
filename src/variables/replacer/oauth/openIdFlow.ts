import { ProcessorContext, Progress } from '../../../models';
import { OpenIdConfiguration } from './openIdConfiguration';
import { OpenIdInformation } from './openIdInformation';


export interface OpenIdFlowContext{
  progress?: Progress | undefined,
  cacheKey: string,
}

export interface OpenIdFlow{
  supportsFlow(flow: string): boolean;
  getCacheKey(config: OpenIdConfiguration): string | false;
  perform(config: OpenIdConfiguration, options: OpenIdFlowContext, context: ProcessorContext): Promise<OpenIdInformation | false>
}
