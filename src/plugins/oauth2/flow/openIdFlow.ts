import type * as models from '../../../models/openIdInformation';

export interface OpenIdFlow {
  supportsFlow(flow: string): boolean;
  getCacheKey(config: models.OpenIdConfiguration): string;
  perform(config: models.OpenIdConfiguration, context: models.OpenIdContext): Promise<models.OpenIdInformation | false>;
}
