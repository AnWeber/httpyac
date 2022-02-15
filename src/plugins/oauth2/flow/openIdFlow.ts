import { OpenIdInformation, OpenIdContext } from '../../../models/openIdInformation';
import { OpenIdConfiguration } from '../openIdConfiguration';

export interface OpenIdFlow {
  supportsFlow(flow: string): boolean;
  getCacheKey(config: OpenIdConfiguration): string | false;
  perform(config: OpenIdConfiguration, context: OpenIdContext): Promise<OpenIdInformation | false>;
}
